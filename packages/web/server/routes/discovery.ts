/* eslint-disable @typescript-eslint/no-explicit-any */
import { zValidator } from '@hono/zod-validator';
import { execa } from 'execa';
import { Hono } from 'hono';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { detect } from 'package-manager-detector/detect';
import stripAnsi from 'strip-ansi';
import kill from 'tree-kill';
import { z } from 'zod';

import { findAvailablePort } from '../helper';

// ==========================================
// 1. STATE MANAGEMENT (Multi-Workspace)
// ==========================================
interface WorkspaceState {
  process: any; // using any prevents strict TS conflicts with execa's custom ChildProcess
  url: string | null;
  status: 'idle' | 'starting' | 'running' | 'error';
}

// Maps an absolute directory path to its running process state
const workspaces = new Map<string, WorkspaceState>();

// Promisify tree-kill since it uses callbacks natively
function killProcess(pid: number, signal = 'SIGKILL'): Promise<void> {
  return new Promise((resolve, reject) => {
    kill(pid, signal, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// ------------------------------------------
// Auto-Cleanup on Vite / Node Server Stop
// ------------------------------------------
async function cleanupAllWorkspaces() {
  for (const [targetDir, state] of workspaces.entries()) {
    if (state.process?.pid) {
      try {
        await killProcess(state.process.pid);
      } catch (e) {
        console.error(`Failed to cleanup process for ${targetDir}:`, e);
      }
    }
  }
  workspaces.clear();
}

// Hook into Node exit signals to ensure subprocesses don't become orphans
['exit', 'SIGINT', 'SIGTERM', 'SIGHUP'].forEach((signal) => {
  process.once(signal, async () => {
    await cleanupAllWorkspaces();
    if (signal !== 'exit') process.exit(0);
  });
});

// ==========================================
// 3. ICON DISCOVERY CONSTANTS & HELPERS
// ==========================================
const ICON_MIME_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

const PRIORITY_KEYWORDS = ['favicon', 'apple-touch-icon', 'icon', 'logo'];

function getIconPriorityScore(fileName: string, ext: string): number {
  const nameLower = fileName.toLowerCase();
  const nameWithoutExt = path.basename(nameLower, ext);

  if (nameLower === 'favicon.svg') return 100;
  if (
    ext === '.svg' &&
    PRIORITY_KEYWORDS.some((kw) => nameWithoutExt.includes(kw))
  )
    return 90;
  if (nameLower === 'favicon.ico') return 80;
  if (ext === '.ico') return 70;
  if (nameWithoutExt.includes('favicon')) return 50;
  if (PRIORITY_KEYWORDS.some((kw) => nameWithoutExt.includes(kw))) return 30;
  return 10;
}

async function findFavicon(
  dirPath: string,
  currentDepth = 0,
  maxDepth = 5,
): Promise<string | null> {
  if (currentDepth > maxDepth) return null;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });
    let bestMatchPath: string | null = null;
    let highestScore = 0;
    const subdirectories: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        if (
          !['node_modules', '.git', 'dist', 'build', '.next'].includes(
            entry.name,
          )
        ) {
          subdirectories.push(fullPath);
        }
        continue;
      }

      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();
        if (ext in ICON_MIME_TYPES) {
          const score = getIconPriorityScore(entry.name, ext);
          if (score === 100) return fullPath;

          if (score > highestScore) {
            highestScore = score;
            bestMatchPath = fullPath;
          }
        }
      }
    }

    if (bestMatchPath && highestScore >= 50) return bestMatchPath;

    for (const subDir of subdirectories) {
      const subDirResult = await findFavicon(
        subDir,
        currentDepth + 1,
        maxDepth,
      );
      if (subDirResult) {
        const subExt = path.extname(subDirResult).toLowerCase();
        const subScore = getIconPriorityScore(
          path.basename(subDirResult),
          subExt,
        );

        if (subScore > highestScore) {
          highestScore = subScore;
          bestMatchPath = subDirResult;
        }
        if (subScore === 100) return subDirResult;
      }
    }

    return bestMatchPath;
  } catch (_err) {
    return null;
  }
}

// ==========================================
// 4. RUN SCRIPT HEURISTIC HELPER
// ==========================================
async function discoverRunCommand(
  targetDir: string,
): Promise<{ command: string; args: string[]; env?: Record<string, string> }> {
  try {
    const files = await fs.readdir(targetDir);

    // Node.js Ecosystem
    if (files.includes('package.json')) {
      let command = 'npm';
      let args = ['start'];

      const pm = await detect({ cwd: targetDir }).catch(() => null);
      if (pm) command = pm.agent;

      try {
        const pkgRaw = await fs.readFile(
          path.join(targetDir, 'package.json'),
          'utf-8',
        );
        const pkg = JSON.parse(pkgRaw);
        if (pkg.scripts?.dev) args = ['run', 'dev'];
        else if (pkg.scripts?.start) args = ['start'];
      } catch {
        // Fallback default
      }

      // Check standard development ports (Vite default is 5173, Next is 3000)
      const defaultPort = args.includes('dev') ? 5173 : 3000;
      const freePort = await findAvailablePort(defaultPort);

      // If the default port is taken, inject PORT env or append CLI port flag
      const env: Record<string, string> = {};
      if (freePort !== defaultPort) {
        env.PORT = String(freePort);
        // For tools like Vite, adding -- --port <port> or passing PORT works well
        if (command === 'vite' || args.includes('dev')) {
          args.push('--', '--port', String(freePort));
        }
      }

      return { command, args, env };
    }

    // Python
    if (
      files.includes('requirements.txt') ||
      files.includes('pyproject.toml') ||
      files.includes('main.py') ||
      files.includes('app.py')
    ) {
      const pyCmd = os.platform() === 'win32' ? 'python' : 'python3';
      const freePort = await findAvailablePort(8000);
      if (files.includes('main.py'))
        return {
          command: pyCmd,
          args: ['main.py'],
          env: { PORT: String(freePort) },
        };
      if (files.includes('app.py'))
        return {
          command: pyCmd,
          args: ['app.py'],
          env: { PORT: String(freePort) },
        };
      return { command: pyCmd, args: ['-m', 'http.server', String(freePort)] };
    }

    // Rust
    if (files.includes('Cargo.toml'))
      return { command: 'cargo', args: ['run'] };

    // Go
    if (files.includes('go.mod') || files.includes('main.go'))
      return { command: 'go', args: ['run', '.'] };

    // Deno
    if (files.includes('deno.json') || files.includes('deno.jsonc')) {
      const freePort = await findAvailablePort(8000);
      return {
        command: 'deno',
        args: ['task', 'dev', '--port', String(freePort)],
      };
    }

    // Static HTML (Vanilla Web)
    if (
      files.includes('index.html') ||
      files.some((f) => f.endsWith('.html'))
    ) {
      const freePort = await findAvailablePort(3000);
      return {
        command: 'npx',
        args: ['--yes', 'serve', '.', '-l', String(freePort)],
      };
    }
  } catch (err) {
    console.error('Failed to discover project type:', err);
  }

  // Absolute fallback
  return { command: 'npm', args: ['start'] };
}

// ==========================================
// 5. SCHEMAS
// ==========================================
const discoverQuerySchema = z.object({
  dir: z.string().min(1, 'Directory path is required'),
  maxDepth: z.coerce.number().min(1).max(10).default(5),
});

const runScriptSchema = z.object({
  directory: z.string().min(1, 'Directory is required'),
});

const statusQuerySchema = z.object({
  directory: z.string().min(1, 'Directory path is required'),
});

// ==========================================
// 6. ROUTES & VITE CLEANUP INTEGRATION
// ==========================================
const discovery = new Hono()

  // ----------------------------------------
  // Favicon Discovery Route
  // ----------------------------------------
  .get('/favicon', zValidator('query', discoverQuerySchema), async (c) => {
    const { dir: targetDir, maxDepth } = c.req.valid('query');

    try {
      const stat = await fs.stat(targetDir);
      if (!stat.isDirectory()) {
        return c.json({ error: 'Provided path is not a directory' }, 400);
      }
    } catch (_err) {
      return c.json(
        { error: 'Directory does not exist or is inaccessible' },
        404,
      );
    }

    const iconPath = await findFavicon(targetDir, 0, maxDepth);

    if (!iconPath) {
      return c.json(
        {
          found: false,
          message: `No favicon or icon file found within ${maxDepth} levels.`,
        },
        404,
      );
    }

    try {
      const ext = path.extname(iconPath).toLowerCase();
      const mimeType = ICON_MIME_TYPES[ext] || 'image/svg+xml';
      const fileBuffer = await fs.readFile(iconPath);
      const dataUri = `data:${mimeType};base64,${fileBuffer.toString('base64')}`;

      return c.json({
        found: true,
        fileName: path.basename(iconPath),
        filePath: iconPath,
        mimeType,
        dataUri,
      });
    } catch (err) {
      return c.json(
        { error: 'Failed to read or encode icon file', details: String(err) },
        500,
      );
    }
  })

  // ----------------------------------------
  // Run Script Route (with auto-port allocation)
  // ----------------------------------------
  .post('/run-script', zValidator('json', runScriptSchema), async (c) => {
    const { directory } = c.req.valid('json');
    const targetDir = path.resolve(directory);

    // 1. Terminate existing process for THIS SPECIFIC directory safely
    const existingState = workspaces.get(targetDir);
    if (existingState?.process?.pid) {
      try {
        await killProcess(existingState.process.pid);
      } catch (e) {
        console.error(`Failed to kill old process for ${targetDir}:`, e);
      }
    }

    // Initialize state for this directory
    const state: WorkspaceState = {
      process: null,
      url: null,
      status: 'starting',
    };
    workspaces.set(targetDir, state);

    // 2. Discover best run command & free port configuration
    const { command, args, env } = await discoverRunCommand(targetDir);

    try {
      // 3. Launch process with inherited environment + custom injected PORT
      const proc = execa(command, args, {
        cwd: targetDir,
        shell: true,
        env: { ...process.env, ...env },
      });
      state.process = proc;

      // 4. Await URL output
      return await new Promise<Response>((resolve) => {
        const urlWaitTimeout = setTimeout(() => {
          if (state.status === 'starting') {
            state.status = 'running';
            resolve(
              c.json({
                success: true,
                url: null,
                message: `Started via ${command} ${args.join(' ')}, but no URL was detected in the logs.`,
              }),
            );
          }
        }, 10_000);

        const handleOutput = (data: any) => {
          if (state.status !== 'starting') return;

          const cleanOutput = stripAnsi(data.toString());
          const match = cleanOutput.match(
            /(https?:\/\/(?:localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]):\d+)/i,
          );

          if (match) {
            clearTimeout(urlWaitTimeout);
            state.url = match[1];
            state.status = 'running';
            resolve(c.json({ success: true, url: state.url }));
          }
        };

        if (proc.stdout) proc.stdout.on('data', handleOutput);
        if (proc.stderr) proc.stderr.on('data', handleOutput);

        proc.catch((error: any) => {
          clearTimeout(urlWaitTimeout);
          state.status = 'error';
          state.process = null;

          if (state.url === null) {
            resolve(
              c.json(
                { success: false, error: `Process failed: ${error.message}` },
                500,
              ),
            );
          }
        });
      });
    } catch (err: any) {
      state.status = 'error';
      return c.json(
        { success: false, error: `Failed to spawn process: ${err.message}` },
        500,
      );
    }
  })

  // ----------------------------------------
  // Stop Script Route
  // ----------------------------------------
  .post('/stop-script', zValidator('json', runScriptSchema), async (c) => {
    const { directory } = c.req.valid('json');
    const targetDir = path.resolve(directory);

    const state = workspaces.get(targetDir);

    if (!state || !state.process?.pid) {
      return c.json(
        {
          success: false,
          message: 'No script is currently running for this directory',
        },
        400,
      );
    }

    try {
      await killProcess(state.process.pid);
      workspaces.delete(targetDir);
      return c.json({ success: true, message: 'Script stopped successfully' });
    } catch (err) {
      return c.json(
        { success: false, error: 'Failed to stop the script' },
        500,
      );
    }
  })

  // ----------------------------------------
  // Script Status Route
  // ----------------------------------------
  .get('/script-status', zValidator('query', statusQuerySchema), (c) => {
    const { directory } = c.req.valid('query');
    const targetDir = path.resolve(directory);

    const state = workspaces.get(targetDir);

    if (!state) {
      return c.json({ status: 'idle', url: null });
    }

    return c.json({
      status: state.status,
      url: state.url,
    });
  });

export function autoCleanupPlugin() {
  return {
    name: 'auto-cleanup-workspaces',
    configureServer(server: any) {
      server.httpServer?.on('close', async () => {
        await cleanupAllWorkspaces();
      });
    },
  };
}

export default discovery;
export type DiscoveryRoutes = typeof discovery;
