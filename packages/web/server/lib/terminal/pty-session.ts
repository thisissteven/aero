import pty from '@homebridge/node-pty-prebuilt-multiarch';
import os from 'node:os';

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;

function resolveShell(): { shell: string; args: string[] } {
  if (process.platform === 'win32') {
    return { shell: process.env.COMSPEC || 'cmd.exe', args: [] };
  }
  return { shell: process.env.SHELL || '/bin/bash', args: ['-l'] };
}

export type PtyProcess = ReturnType<typeof pty.spawn>;

export function createPtySession(
  cols = DEFAULT_COLS,
  rows = DEFAULT_ROWS,
): PtyProcess {
  const { shell, args } = resolveShell();
  return pty.spawn(shell, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd: os.homedir(),
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
  });
}

// Dev-only path: Vite's httpServer + the `ws` package (event-based API).
// Bun's prod server uses createPtySession() directly with its own
// open/message/close handler shape instead — see start.ts.
interface WsLikeSocket {
  readyState: number;
  OPEN: number;
  send(data: string): void;
  close(): void;
  on(
    event: 'message',
    cb: (data: { toString(enc: 'utf8'): string }) => void,
  ): void;
  on(event: 'close', cb: () => void): void;
  on(event: 'error', cb: () => void): void;
}

const devSessions = new WeakMap<WsLikeSocket, { pty: PtyProcess }>();

export function attachPtyToSocket(
  ws: WsLikeSocket,
  cols?: number,
  rows?: number,
) {
  const ptyProcess = createPtySession(cols, rows);
  devSessions.set(ws, { pty: ptyProcess });

  ptyProcess.onData((data) => {
    if (ws.readyState === ws.OPEN) ws.send(data);
  });
  ptyProcess.onExit(({ exitCode }) => {
    if (ws.readyState === ws.OPEN) {
      ws.send(`\r\n\x1b[33mShell exited (code: ${exitCode})\x1b[0m\r\n`);
      ws.close();
    }
  });
  ws.on('message', (data) => {
    const message = data.toString('utf8');
    if (message.startsWith('{')) {
      try {
        const msg = JSON.parse(message);
        if (msg.type === 'resize') return ptyProcess.resize(msg.cols, msg.rows);
      } catch {
        /* raw input, not JSON */
      }
    }
    ptyProcess.write(message);
  });
  ws.on('close', () => {
    devSessions.get(ws)?.pty.kill();
    devSessions.delete(ws);
  });
  ws.on('error', () => {});

  return ptyProcess;
}
