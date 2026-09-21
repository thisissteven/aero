import { spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);

const HERE = path.dirname(fileURLToPath(import.meta.url));
const AERO_HOME = process.env.AERO_HOME || path.join(os.homedir(), '.aero');
const LOG_DIR = path.join(AERO_HOME, 'logs');
const CHILD_FLAG = 'AERO_SERVER_CHILD';

function pidFileFor(port: number): string {
  return path.join(AERO_HOME, `aero-${port}.pid`);
}

function logFileFor(port: number): string {
  return path.join(LOG_DIR, `aero-${port}.log`);
}

// -----------------------------------------------------------------------------
// Env / config
// -----------------------------------------------------------------------------

export function getPort(): number {
  return Number(process.env.AERO_PORT) || Number(process.env.PORT) || 3000;
}

export function getHost(): string {
  return process.env.AERO_HOST || '127.0.0.1';
}

export function isServerChild(): boolean {
  return process.env[CHILD_FLAG] === '1';
}

// -----------------------------------------------------------------------------
// PID files
// -----------------------------------------------------------------------------

export function ensureAeroHome(): void {
  fs.mkdirSync(LOG_DIR, { recursive: true });
}

export function readPid(port: number): number | null {
  try {
    const raw = fs.readFileSync(pidFileFor(port), 'utf-8');
    const pid = Number(raw.trim());
    return Number.isFinite(pid) && pid > 0 ? pid : null;
  } catch {
    return null;
  }
}

export function writePid(port: number, pid: number): void {
  ensureAeroHome();
  fs.writeFileSync(pidFileFor(port), String(pid));
}

export function removePid(port: number): void {
  try {
    fs.unlinkSync(pidFileFor(port));
  } catch {
    // ignore
  }
}

/**
 * Every port that currently has a PID file in ~/.aero. Used by
 * `aero stop` with no arguments to sweep all instances.
 */
export function listTrackedPorts(): number[] {
  try {
    return fs
      .readdirSync(AERO_HOME)
      .map((f) => f.match(/^aero-(\d+)\.pid$/)?.[1])
      .filter((p): p is string => Boolean(p))
      .map(Number)
      .sort((a, b) => a - b);
  } catch {
    return [];
  }
}

export function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch {
    return false;
  }
}

export function killServer(pid: number | null): void {
  if (!pid) return;

  if (process.platform === 'win32') {
    // taskkill /T kills the process tree, which we need because the
    // daemon may have spawned opencode children. windowsHide is honored
    // here because we are NOT detaching this spawn — it runs in the
    // CLI's own console.
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

// -----------------------------------------------------------------------------
// Server health
// -----------------------------------------------------------------------------

export async function checkServer(
  port: number,
  host: string,
): Promise<boolean> {
  try {
    const res = await fetch(`http://${host}:${port}/api/sessions?limit=1`, {
      signal: AbortSignal.timeout(1500),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// -----------------------------------------------------------------------------
// Server entrypoint resolution
// -----------------------------------------------------------------------------

export interface ServerLocation {
  entry: string;
  cwd: string;
}

export function locateServer(): ServerLocation {
  const tried: string[] = [];

  try {
    const webPkgJson = require.resolve('@aero/web/package.json');
    const webDir = path.dirname(webPkgJson);
    const entry = path.join(webDir, 'server', 'start.ts');
    tried.push(entry);
    if (fs.existsSync(entry)) {
      return { entry, cwd: webDir };
    }
  } catch {
    // fall through
  }

  let dir = HERE;
  for (let i = 0; i < 8; i++) {
    const webDir = path.join(dir, 'web');
    const entry = path.join(webDir, 'server', 'start.ts');
    tried.push(entry);
    if (fs.existsSync(entry)) {
      return { entry, cwd: webDir };
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }

  throw new Error(
    `Could not locate @aero/web's server entrypoint.\nTried:\n  ${tried.join('\n  ')}`,
  );
}

// -----------------------------------------------------------------------------
// Bun discovery
// -----------------------------------------------------------------------------

function resolveBunBinary(): string {
  const versions = process.versions as Record<string, string | undefined>;
  if (typeof versions.bun === 'string') {
    return process.execPath;
  }
  return process.platform === 'win32' ? 'bun.exe' : 'bun';
}

// -----------------------------------------------------------------------------
// Windows daemon launcher
// -----------------------------------------------------------------------------
//
// On Windows, `detached: true` + `windowsHide: true` is a broken
// combination (nodejs/node#21825). Detaching forces a new console for
// the daemon; `windowsHide` is silently ignored. Then every grandchild
// (opencode, git, ...) has no console to inherit and Windows allocates
// a fresh one for each — the infinite window storm.
//
// The fix (same approach as OpenChamber): do NOT detach on Windows.
// Instead spawn a hidden PowerShell helper that uses Start-Process
// -WindowStyle Hidden to launch the daemon. The helper itself is
// hidden via windowsHide (which works, because we don't detach it).
// The daemon inherits the helper's console (which is hidden), so its
// own children inherit it too — no new windows.

async function spawnWindowsDaemon(
  runner: string,
  entry: string,
  cwd: string,
  env: NodeJS.ProcessEnv,
  logFile: string,
): Promise<number> {
  const pidFile = path.join(
    AERO_HOME,
    `spawn-${process.pid}-${Date.now()}.pid`,
  );
  const logErr = `${logFile}.err`;

  // PowerShell single-quote escape: ' → ''
  const q = (s: string) => `'${s.replace(/'/g, "''")}'`;

  // -WindowStyle Hidden        -> SW_HIDE on the child (no console window)
  // -PassThru                  -> return the Process object so we can read Id
  // -RedirectStandardOutput/Err-> keep logs; these open the files for writing
  // -ArgumentList @(...)       -> array form avoids arg-splitting on spaces
  const psScript = [
    `$p = Start-Process`,
    `-FilePath ${q(runner)}`,
    `-ArgumentList @(${q(entry)})`,
    `-WorkingDirectory ${q(cwd)}`,
    `-WindowStyle Hidden`,
    `-PassThru`,
    `-RedirectStandardOutput ${q(logFile)}`,
    `-RedirectStandardError ${q(logErr)}`,
    `;`,
    `$p.Id | Out-File -Encoding ascii -NoNewline -FilePath ${q(pidFile)}`,
  ].join(' ');

  // -EncodedCommand expects UTF-16LE base64. This sidesteps all
  // quoting/escaping issues that broke the previous attempt.
  const encoded = Buffer.from(psScript, 'utf16le').toString('base64');

  await new Promise<void>((resolve, reject) => {
    const ps = spawn(
      'powershell.exe',
      [
        '-NoProfile',
        '-NonInteractive',
        '-ExecutionPolicy',
        'Bypass',
        '-WindowStyle',
        'Hidden',
        '-EncodedCommand',
        encoded,
      ],
      {
        stdio: 'ignore',
        windowsHide: true,
        env,
      },
    );

    ps.on('error', (err) => {
      reject(
        new Error(
          `Failed to spawn PowerShell helper: ${err.message}\n` +
            `Is powershell.exe available on PATH?`,
        ),
      );
    });

    ps.on('exit', (code) => {
      if (code === 0) resolve();
      else
        reject(
          new Error(
            `PowerShell helper exited with code ${code}. ` +
              `Run \`powershell -Command Get-ExecutionPolicy\` to check policy.`,
          ),
        );
    });
  });

  // Start-Process returns after the process is created, but Out-File
  // may take a beat. Poll the temp file.
  for (let i = 0; i < 50; i++) {
    try {
      const raw = fs.readFileSync(pidFile, 'utf-8').trim();
      const pid = Number(raw);
      if (Number.isFinite(pid) && pid > 0) {
        try {
          fs.unlinkSync(pidFile);
        } catch {
          // ignore
        }
        return pid;
      }
    } catch {
      // not written yet
    }
    await new Promise((r) => setTimeout(r, 100));
  }

  throw new Error(
    `PowerShell helper did not report a PID within 5s.\nCheck ${logErr}.`,
  );
}

// -----------------------------------------------------------------------------
// Server spawn
// -----------------------------------------------------------------------------

export interface StartServerOptions {
  port: number;
  host: string;
  foreground: boolean;
  apiOnly: boolean;
  uiPassword?: string;
  serverUrl?: string;
  relay?: boolean;
}

export async function startServer(opts: StartServerOptions): Promise<number> {
  if (isServerChild()) {
    throw new Error(
      'Refusing to start a server from inside a server child (AERO_SERVER_CHILD=1).',
    );
  }

  const { entry, cwd } = locateServer();
  const runner = resolveBunBinary();

  ensureAeroHome();

  const env: NodeJS.ProcessEnv = {
    ...process.env,
    PORT: String(opts.port),
    AERO_PORT: String(opts.port),
    AERO_HOST: opts.host,
    [CHILD_FLAG]: '1',
  };

  if (opts.apiOnly) env.AERO_API_ONLY = '1';
  if (opts.uiPassword) env.AERO_UI_PASSWORD = opts.uiPassword;
  if (opts.serverUrl) env.AERO_SERVER_URL = opts.serverUrl;
  if (opts.relay) env.AERO_RELAY = '1';

  const logFile = logFileFor(opts.port);

  // Foreground: inherit stdio, forward signals, exit with the child.
  if (opts.foreground) {
    const child = spawn(runner, [entry], {
      stdio: 'inherit',
      cwd,
      env,
      windowsHide: true,
    });

    for (const sig of ['SIGINT', 'SIGTERM'] as const) {
      process.on(sig, () => {
        if (!child.killed) child.kill(sig);
      });
    }

    child.on('error', (err) => {
      console.error(`Failed to spawn server: ${err.message}`);
      process.exit(1);
    });

    child.on('exit', (code, signal) => {
      process.exit(code ?? (signal ? 1 : 0));
    });

    return child.pid ?? 0;
  }

  // Daemon. Platform-split: POSIX uses detached spawn, Windows uses a
  // hidden PowerShell helper (see comment on spawnWindowsDaemon).
  let pid: number;

  if (process.platform === 'win32') {
    pid = await spawnWindowsDaemon(runner, entry, cwd, env, logFile);
  } else {
    const logFd = fs.openSync(logFile, 'a');

    const child = spawn(runner, [entry], {
      stdio: ['ignore', logFd, logFd],
      detached: true,
      cwd,
      env,
    });

    child.unref();

    if (!child.pid) {
      throw new Error('spawn() returned no PID');
    }
    pid = child.pid;
  }

  // Liveness: give it a beat, then verify it's actually still alive.
  await new Promise((r) => setTimeout(r, 800));
  if (!isProcessAlive(pid)) {
    throw new Error(
      `Server exited within 800ms of spawn.\nSee ${logFile} for details.`,
    );
  }

  // Reachability: poll /api/sessions until it responds or we give up.
  let up = false;
  for (let i = 0; i < 20; i++) {
    if (await checkServer(opts.port, opts.host)) {
      up = true;
      break;
    }
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!up) {
    throw new Error(
      `Server PID ${pid} is alive but never became reachable on ` +
        `${opts.host}:${opts.port}.\nSee ${logFile} for details.`,
    );
  }

  writePid(opts.port, pid);
  return pid;
}

/**
 * Poll until the server on (host, port) stops responding, or we give up.
 * Used after killServer() so `restart` doesn't race the old process's
 * shutdown sequence.
 */
export async function waitForServerDown(
  port: number,
  host: string,
  timeoutMs = 5000,
): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (!(await checkServer(port, host))) return true;
    await new Promise((r) => setTimeout(r, 150));
  }
  return false;
}
