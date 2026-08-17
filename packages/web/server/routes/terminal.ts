import * as pty from '@homebridge/node-pty-prebuilt-multiarch';
import { Hono } from 'hono';
import { upgradeWebSocket } from 'hono/bun';
import { HTTPException } from 'hono/http-exception';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

type ClientMessage =
  | { type: 'input'; data: string }
  | { type: 'resize'; cols: number; rows: number };

type ServerMessage =
  | { type: 'ready'; shell: string; cwd: string; cols: number; rows: number }
  | { type: 'output'; data: string }
  | { type: 'exit'; exitCode: number; signal?: number }
  | { type: 'error'; message: string };

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const MIN_COLS = 2;
const MIN_ROWS = 1;
const MAX_COLS = 500;
const MAX_ROWS = 300;

function sendJson(
  ws: { send: (data: string) => void },
  message: ServerMessage,
) {
  ws.send(JSON.stringify(message));
}

function parsePositiveInt(value: string | null, fallback: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;

  return Math.floor(parsed);
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function findWorkspaceRoot(start = process.cwd()) {
  let current = resolve(start);

  while (true) {
    const packageJsonPath = join(current, 'package.json');

    if (existsSync(packageJsonPath)) {
      try {
        const packageJson = JSON.parse(readFileSync(packageJsonPath, 'utf8'));

        if (packageJson.workspaces) return current;
      } catch {
        return current;
      }
    }

    const parent = dirname(current);
    if (parent === current) return start;
    current = parent;
  }
}

function resolveShell(requestedShell: string | null) {
  const shell =
    requestedShell && requestedShell !== 'auto' ? requestedShell : '';

  if (process.platform === 'win32') {
    if (shell === 'bash' || shell === 'zsh') return { file: shell, args: [] };
    if (shell === 'powershell')
      return { file: 'powershell.exe', args: ['-NoLogo'] };

    return {
      file: process.env.ComSpec || 'powershell.exe',
      args: process.env.ComSpec ? [] : ['-NoLogo'],
    };
  }

  if (shell === 'powershell') return { file: 'pwsh', args: ['-NoLogo'] };
  if (shell === 'bash' || shell === 'zsh') return { file: shell, args: [] };

  return {
    file: process.env.SHELL || (process.platform === 'darwin' ? 'zsh' : 'bash'),
    args: [],
  };
}

function parseClientMessage(data: unknown): ClientMessage | null {
  if (typeof data !== 'string') return null;

  try {
    const parsed = JSON.parse(data);
    if (!parsed || typeof parsed !== 'object') return null;

    if (parsed.type === 'input' && typeof parsed.data === 'string') {
      return parsed;
    }

    if (
      parsed.type === 'resize' &&
      Number.isFinite(parsed.cols) &&
      Number.isFinite(parsed.rows)
    ) {
      return {
        type: 'resize',
        cols: clamp(Math.floor(parsed.cols), MIN_COLS, MAX_COLS),
        rows: clamp(Math.floor(parsed.rows), MIN_ROWS, MAX_ROWS),
      };
    }
  } catch {
    return null;
  }

  return null;
}

function ensureSameOrigin(origin: string | undefined, requestUrl: string) {
  if (!origin) return;

  const originUrl = new URL(origin);
  const url = new URL(requestUrl);

  // Allow same-hostname with different ports — during dev, the Vite proxy
  // forwards from localhost:5173 to the terminal server on localhost:3001.
  if (originUrl.hostname !== url.hostname) {
    throw new HTTPException(403, {
      message: 'Terminal WebSocket origin denied',
    });
  }
}

const terminal = new Hono().get(
  '/ws',
  upgradeWebSocket((c) => {
    ensureSameOrigin(c.req.header('origin'), c.req.url);

    const url = new URL(c.req.url);
    const cwd = findWorkspaceRoot();
    const cols = clamp(
      parsePositiveInt(url.searchParams.get('cols'), DEFAULT_COLS),
      MIN_COLS,
      MAX_COLS,
    );
    const rows = clamp(
      parsePositiveInt(url.searchParams.get('rows'), DEFAULT_ROWS),
      MIN_ROWS,
      MAX_ROWS,
    );
    const shell = resolveShell(url.searchParams.get('shell'));

    let terminalProcess: pty.IPty | null = null;
    let dataSubscription: pty.IDisposable | null = null;
    let exitSubscription: pty.IDisposable | null = null;

    const cleanup = () => {
      dataSubscription?.dispose();
      exitSubscription?.dispose();
      dataSubscription = null;
      exitSubscription = null;

      if (terminalProcess) {
        try {
          terminalProcess.kill();
        } catch {
          // The PTY can already be gone when the socket closes.
        }
      }

      terminalProcess = null;
    };

    return {
      onOpen(_event, ws) {
        try {
          terminalProcess = pty.spawn(shell.file, shell.args, {
            name: 'xterm-256color',
            cols,
            rows,
            cwd,
            env: {
              ...process.env,
              COLORTERM: 'truecolor',
              TERM: 'xterm-256color',
            },
          });

          dataSubscription = terminalProcess.onData((data) => {
            sendJson(ws, { type: 'output', data });
          });

          exitSubscription = terminalProcess.onExit(({ exitCode, signal }) => {
            sendJson(ws, { type: 'exit', exitCode, signal });
            ws.close();
          });

          sendJson(ws, {
            type: 'ready',
            shell: shell.file,
            cwd,
            cols,
            rows,
          });
        } catch (error) {
          sendJson(ws, {
            type: 'error',
            message:
              error instanceof Error
                ? error.message
                : 'Failed to start terminal session',
          });
          ws.close();
        }
      },
      onMessage(event, ws) {
        const message = parseClientMessage(event.data);
        if (!message || !terminalProcess) return;

        if (message.type === 'input') {
          terminalProcess.write(message.data);
          return;
        }

        terminalProcess.resize(message.cols, message.rows);
        sendJson(ws, {
          type: 'ready',
          shell: shell.file,
          cwd,
          cols: message.cols,
          rows: message.rows,
        });
      },
      onClose: cleanup,
      onError: cleanup,
    };
  }),
);

export default terminal;
