// lib/terminal/pty-session.dev.ts

import pty from '@lydell/node-pty';
import fs from 'node:fs';
import os from 'node:os';

const DEFAULT_COLS = 80;
const DEFAULT_ROWS = 24;
const MAX_BUFFER_SIZE = 1_000_000;

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
  initialCwd?: string,
): PtyProcess {
  const { shell, args } = resolveShell();

  let cwd = initialCwd || os.homedir();
  try {
    if (!cwd || !fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
      cwd = os.homedir();
    }
  } catch {
    cwd = os.homedir();
  }

  return pty.spawn(shell, args, {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: { ...process.env, TERM: 'xterm-256color', COLORTERM: 'truecolor' },
  });
}

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

interface Session {
  pty: PtyProcess;
  buffer: string;
  sockets: Set<WsLikeSocket>;
}

const activeSessions = new Map<string, Session>();

export function attachPtyToSocket(
  ws: WsLikeSocket,
  sessionId: string,
  cols?: number,
  rows?: number,
  reset = false,
  cwd?: string,
) {
  let session = activeSessions.get(sessionId);

  if (reset || !session) {
    if (session) {
      const oldPty = session.pty;
      // Remove reference so onExit suppresses exit messages for the old process
      activeSessions.delete(sessionId);

      try {
        oldPty.kill();
      } catch {
        /* ignore */
      }
    }

    // Instantly wipe terminal screen on client using ANSI reset escape code
    if (ws.readyState === ws.OPEN) {
      ws.send('\x1bc');
    }

    const ptyProcess = createPtySession(cols, rows, cwd);

    session = {
      pty: ptyProcess,
      buffer: '',
      sockets: new Set<WsLikeSocket>(),
    };

    activeSessions.set(sessionId, session);

    ptyProcess.onData((data) => {
      const currentSession = activeSessions.get(sessionId);
      if (!currentSession || currentSession.pty !== ptyProcess) return;

      currentSession.buffer += data;
      if (currentSession.buffer.length > MAX_BUFFER_SIZE) {
        currentSession.buffer = currentSession.buffer.slice(
          currentSession.buffer.length - MAX_BUFFER_SIZE,
        );
      }

      for (const socket of currentSession.sockets) {
        if (socket.readyState === socket.OPEN) {
          socket.send(data);
        }
      }
    });

    ptyProcess.onExit(({ exitCode }) => {
      const currentSession = activeSessions.get(sessionId);

      // Only handle exit if this process is STILL the active process (not an old process being reset)
      if (currentSession && currentSession.pty === ptyProcess) {
        for (const socket of currentSession.sockets) {
          if (socket.readyState === socket.OPEN) {
            socket.send(
              `\r\n\x1b[33mShell exited (code: ${exitCode})\x1b[0m\r\n`,
            );
            socket.close();
          }
        }
        activeSessions.delete(sessionId);
      }
    });
  }

  session.sockets.add(ws);

  // Replay output history on reconnect (only if not reset)
  if (!reset && session.buffer && ws.readyState === ws.OPEN) {
    ws.send(session.buffer);
  }

  ws.on('message', (data) => {
    const currentSession = activeSessions.get(sessionId);
    if (!currentSession) return;

    const message = data.toString('utf8');
    if (message.startsWith('{')) {
      try {
        const msg = JSON.parse(message);
        if (msg.type === 'resize' && msg.cols > 0 && msg.rows > 0) {
          return currentSession.pty.resize(msg.cols, msg.rows);
        }
      } catch {
        /* raw input */
      }
    }
    currentSession.pty.write(message);
  });

  ws.on('close', () => {
    const currentSession = activeSessions.get(sessionId);
    if (currentSession) {
      currentSession.sockets.delete(ws);
    }
  });

  ws.on('error', () => {});

  return session.pty;
}
