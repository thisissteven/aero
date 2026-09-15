import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { detect } from 'package-manager-detector/detect';
import { z } from 'zod';

// ==========================================
// ICON DISCOVERY CONSTANTS & HELPERS
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
  ) {
    return 90;
  }

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

      if (!entry.isFile()) continue;

      const ext = path.extname(entry.name).toLowerCase();

      if (!(ext in ICON_MIME_TYPES)) continue;

      const score = getIconPriorityScore(entry.name, ext);

      if (score === 100) {
        return fullPath;
      }

      if (score > highestScore) {
        highestScore = score;
        bestMatchPath = fullPath;
      }
    }

    if (bestMatchPath && highestScore >= 50) {
      return bestMatchPath;
    }

    for (const subDir of subdirectories) {
      const subDirResult = await findFavicon(
        subDir,
        currentDepth + 1,
        maxDepth,
      );

      if (!subDirResult) continue;

      const subExt = path.extname(subDirResult).toLowerCase();

      const subScore = getIconPriorityScore(
        path.basename(subDirResult),
        subExt,
      );

      if (subScore > highestScore) {
        highestScore = subScore;
        bestMatchPath = subDirResult;
      }

      if (subScore === 100) {
        return subDirResult;
      }
    }

    return bestMatchPath;
  } catch {
    return null;
  }
}

// ==========================================
// SCRIPT DISCOVERY & DETERMINISTIC EXECUTION
// ==========================================
const IGNORED_DIRECTORIES = new Set([
  'node_modules',
  '.git',
  '.next',
  '.nuxt',
  '.turbo',
  'dist',
  'build',
  'out',
  'coverage',
  '.cache',
  '.idea',
  '.vscode',
]);

interface ProjectCandidate {
  directory: string;
  command: string;
  score: number;
}

async function getProjectCommand(
  directory: string,
): Promise<{ command: string; score: number } | null> {
  const files = await fs.readdir(directory);

  // ==========================================
  // Node.js ecosystem
  // ==========================================
  if (files.includes('package.json')) {
    let packageManager = 'npm';

    const detected = await detect({ cwd: directory }).catch(() => null);

    if (detected?.agent) {
      packageManager = detected.agent;
    }

    try {
      const packageJson = JSON.parse(
        await fs.readFile(path.join(directory, 'package.json'), 'utf-8'),
      );

      if (packageJson.scripts?.dev) {
        return {
          command: `${packageManager} run dev`,
          score: 100,
        };
      }

      if (packageJson.scripts?.start) {
        return {
          command: `${packageManager} start`,
          score: 90,
        };
      }
    } catch {
      return null;
    }

    return null;
  }

  // ==========================================
  // Python
  // ==========================================
  if (
    files.includes('main.py') ||
    files.includes('app.py') ||
    files.includes('pyproject.toml') ||
    files.includes('requirements.txt')
  ) {
    const pyCmd = os.platform() === 'win32' ? 'python' : 'python3';

    if (files.includes('main.py')) {
      return {
        command: `${pyCmd} main.py`,
        score: 100,
      };
    }

    if (files.includes('app.py')) {
      return {
        command: `${pyCmd} app.py`,
        score: 95,
      };
    }

    return {
      command: `${pyCmd} -m http.server 8000`,
      score: 60,
    };
  }

  // ==========================================
  // Rust
  // ==========================================
  if (files.includes('Cargo.toml')) {
    return {
      command: 'cargo run',
      score: 100,
    };
  }

  // ==========================================
  // Go
  // ==========================================
  if (files.includes('go.mod') || files.includes('main.go')) {
    return {
      command: 'go run .',
      score: 100,
    };
  }

  // ==========================================
  // Deno
  // ==========================================
  if (files.includes('deno.json') || files.includes('deno.jsonc')) {
    return {
      command: 'deno task dev',
      score: 80,
    };
  }

  // ==========================================
  // Static HTML
  // ==========================================
  if (
    files.includes('index.html') ||
    files.some((file) => file.endsWith('.html'))
  ) {
    return {
      command: 'npx --yes serve . -l 3000',
      score: 50,
    };
  }

  return null;
}

function buildDeterministicCommand(directory: string, command: string): string {
  const absoluteDirectory = path.resolve(directory);

  if (os.platform() === 'win32') {
    const windowsDirectory = absoluteDirectory.replaceAll('"', '\\"');

    return `cd /d "${windowsDirectory}" && ${command}`;
  }

  const shellDirectory = absoluteDirectory.replaceAll("'", "'\\''");

  return `cd '${shellDirectory}' && ${command}`;
}

async function discoverRunCommand(
  targetDir: string,
  maxDepth = 5,
): Promise<string> {
  const root = path.resolve(targetDir);

  const queue: Array<{
    directory: string;
    depth: number;
  }> = [
    {
      directory: root,
      depth: 0,
    },
  ];

  const candidates: ProjectCandidate[] = [];

  while (queue.length > 0) {
    const current = queue.shift();

    if (!current || current.depth > maxDepth) {
      continue;
    }

    const project = await getProjectCommand(current.directory).catch(
      () => null,
    );

    if (project) {
      candidates.push({
        directory: current.directory,
        command: project.command,
        score: project.score - current.depth,
      });
    }

    if (current.depth >= maxDepth) {
      continue;
    }

    const entries = await fs
      .readdir(current.directory, { withFileTypes: true })
      .catch(() => []);

    for (const entry of entries) {
      if (!entry.isDirectory()) {
        continue;
      }

      if (IGNORED_DIRECTORIES.has(entry.name)) {
        continue;
      }

      queue.push({
        directory: path.join(current.directory, entry.name),
        depth: current.depth + 1,
      });
    }
  }

  if (candidates.length === 0) {
    throw new Error('No runnable project found');
  }

  candidates.sort((a, b) => {
    if (b.score !== a.score) {
      return b.score - a.score;
    }

    return a.directory.length - b.directory.length;
  });

  const candidate = candidates[0];

  return buildDeterministicCommand(candidate.directory, candidate.command);
}

// ==========================================
// SCHEMAS
// ==========================================
const discoverQuerySchema = z.object({
  dir: z.string().min(1, 'Directory path is required'),
  maxDepth: z.coerce.number().min(1).max(10).default(5),
});

const discoverScriptSchema = z.object({
  targetDir: z.string().min(1, 'Target directory is required'),
});

// ==========================================
// ROUTES
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
    } catch {
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
      const dataUri = `data:${mimeType};base64,${fileBuffer.toString(
        'base64',
      )}`;

      return c.json({
        found: true,
        fileName: path.basename(iconPath),
        filePath: iconPath,
        mimeType,
        dataUri,
      });
    } catch (err) {
      return c.json(
        {
          error: 'Failed to read or encode icon file',
          details: String(err),
        },
        500,
      );
    }
  })

  // ----------------------------------------
  // Script Discovery Route
  // ----------------------------------------
  .post(
    '/discover-script',
    zValidator('json', discoverScriptSchema),
    async (c) => {
      const { targetDir } = c.req.valid('json');
      const resolvedTargetDir = path.resolve(targetDir);

      try {
        const stat = await fs.stat(resolvedTargetDir);

        if (!stat.isDirectory()) {
          return c.json({ error: 'Provided path is not a directory' }, 400);
        }
      } catch {
        return c.json(
          {
            error: 'Directory does not exist or is inaccessible',
          },
          404,
        );
      }

      try {
        const command = await discoverRunCommand(resolvedTargetDir, 5);

        return c.json({ command });
      } catch (err) {
        return c.json(
          {
            error: 'No runnable project found',
            details: String(err),
          },
          404,
        );
      }
    },
  );

export default discovery;
export type DiscoveryRoutes = typeof discovery;
