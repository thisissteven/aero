import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const PID_FILE = path.join(os.homedir(), '.aero', 'cli-server.pid');
const CHILD_FLAG = 'AERO_SERVER_CHILD';

export function isServerChild(): boolean {
  return process.env[CHILD_FLAG] === '1';
}

export function getServerPort(): number {
  return (
    Number(process.env.AERO_PORT) ||
    Number(process.env.OPENCHAMBER_PORT) ||
    3000
  );
}

export function getHost(): string {
  return process.env.AERO_HOST || process.env.OPENCHAMBER_HOST || '127.0.0.1';
}

export async function checkServer(
  port: number,
  host = '127.0.0.1',
): Promise<boolean> {
  try {
    const res = await fetch(`http://${host}:${port}/api/sessions?limit=1`, {
      method: 'GET',
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function readPid(): number | null {
  try {
    const raw = fs.readFileSync(PID_FILE, 'utf-8');
    const pid = Number(raw.trim());
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

export function writePid(pid: number): void {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, String(pid));
}

export function removePid(): void {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    // ignore
  }
}

export function killServer(pid: number | null): void {
  if (!pid) return;

  if (process.platform === 'win32') {
    try {
      spawn('taskkill', ['/PID', String(pid), '/T', '/F'], {
        stdio: 'ignore',
        windowsHide: true,
      });
    } catch {
      // ignore
    }
    return;
  }

  // POSIX: try the process group first (works if spawned detached),
  // fall back to the pid itself.
  try {
    process.kill(-pid, 'SIGTERM');
  } catch {
    try {
      process.kill(pid, 'SIGTERM');
    } catch {
      // already gone
    }
  }
}

/**
 * Walk up from this file's directory and return the first existing
 * web-server entrypoint. Handles both the published layout
 * (dist/web/server.js next to index.js) and the monorepo dev layout
 * (packages/web/server/start.ts).
 */
export function findWebEntry(): string {
  const candidatesAt = (dir: string): string[] => [
    path.join(dir, 'dist/web/server.js'),
    path.join(dir, 'web/server.js'),
    path.join(dir, 'web/server/start.ts'),
    path.join(dir, 'packages/web/dist/server.js'),
    path.join(dir, 'packages/web/server/start.ts'),
  ];

  const seen: string[] = [];
  let dir = HERE;

  for (let i = 0; i < 8; i++) {
    for (const candidate of candidatesAt(dir)) {
      seen.push(candidate);
      if (fs.existsSync(candidate)) return candidate;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    `Could not locate the Aero web server entrypoint.\nLooked in:\n  ${seen.join('\n  ')}`,
  );
}

export function startServer(port: number, host: string): number | undefined {
  if (isServerChild()) {
    throw new Error(
      'Refusing to start a server from inside a server child (AERO_SERVER_CHILD=1).',
    );
  }

  const serverPath = findWebEntry();

  // Bun can run .ts natively. Node cannot. Pick the right runner
  // based on what the resolver actually found.
  const runner = serverPath.endsWith('.ts') ? 'bun' : process.execPath;

  const child = spawn(runner, [serverPath], {
    stdio: 'ignore',
    detached: true,
    windowsHide: true,
    cwd: path.dirname(serverPath),
    env: {
      ...process.env,
      PORT: String(port),
      AERO_PORT: String(port),
      AERO_HOST: host,
      [CHILD_FLAG]: '1',
    },
  });

  child.unref();

  if (child.pid) {
    writePid(child.pid);
  }

  return child.pid;
}
