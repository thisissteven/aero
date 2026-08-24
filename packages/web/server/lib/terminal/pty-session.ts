/* eslint-disable @typescript-eslint/no-explicit-any */
// server/lib/terminal/pty-session.ts
import { ChildProcess, spawn } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';

const require = createRequire(import.meta.url);

export interface WsLikeSocket {
  readyState: number;
  bufferedAmount?: number;
  send(data: string | Uint8Array): void;
  close(code?: number, reason?: string): void;
  on?(event: 'message', listener: (data: any) => void): void;
  on?(event: 'close', listener: () => void): void;
  on?(event: 'error', listener: (err: any) => void): void;
}

interface ProcessWrapper {
  onData(cb: (data: string) => void): void;
  onExit(cb: () => void): void;
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(): void;
  pause?(): void;
  resume?(): void;
}

interface Session {
  pty: ProcessWrapper;
  buffer: string[];
  totalBufferLength: number;
  sockets: Set<WsLikeSocket>;
}

const sessions = new Map<string, Session>();
const isBun =
  typeof process !== 'undefined' &&
  'versions' in process &&
  'bun' in process.versions;
const isWindows = process.platform === 'win32';

// Capped backpressure limit (1MB max WS backpressure buffer)
const MAX_WS_BUFFERED_AMOUNT = 1024 * 1024;
// Limit history buffer to avoid RAM bloat on giant terminal spams
const MAX_HISTORY_CHUNKS = 1000;

function createPtyProcess(
  cols: number,
  rows: number,
  initialCwd?: string,
): ProcessWrapper {
  let cwd = initialCwd || os.homedir();

  try {
    if (!cwd || !fs.existsSync(cwd) || !fs.statSync(cwd).isDirectory()) {
      cwd = os.homedir();
    }
  } catch {
    cwd = process.cwd();
  }

  if (isBun && isWindows) {
    const workerScript = `
      import readline from 'node:readline';

      (async () => {
        const ptyModule = await import('@lydell/node-pty');
        const pty = ptyModule.default || ptyModule;

        const shell = process.env.COMSPEC || 'cmd.exe';
        const ptyProcess = pty.spawn(shell, [], {
          name: 'xterm-256color',
          cols: ${cols},
          rows: ${rows},
          cwd: ${JSON.stringify(cwd)},
          env: process.env,
        });

        ptyProcess.onData((data) => {
          const b64 = Buffer.from(data, 'utf-8').toString('base64');
          // Write chunk direct to stdout; handle non-blocking flow
          process.stdout.write('D:' + b64 + '\\n');
        });

        ptyProcess.onExit(() => {
          process.stdout.write('X:\\n');
          process.exit(0);
        });

        const rl = readline.createInterface({
          input: process.stdin,
          output: process.stdout,
          terminal: false,
        });

        rl.on('line', (line) => {
          if (!line) return;
          const cmd = line[0];
          const payload = line.slice(2);

          if (cmd === 'I') {
            const input = Buffer.from(payload, 'base64').toString('utf-8');
            ptyProcess.write(input);
          } else if (cmd === 'R') {
            const [c, r] = payload.split(',').map(Number);
            if (c > 0 && r > 0) ptyProcess.resize(c, r);
          }
        });
      })();
    `;

    const worker: ChildProcess = spawn('node', ['-e', workerScript], {
      stdio: ['pipe', 'pipe', 'inherit'],
      env: process.env,
    });

    worker.unref();

    let onDataCb: (data: string) => void = () => {};
    let onExitCb: () => void = () => {};

    let buffer = '';

    // Explicitly set high watermark on worker stdout to avoid pipe lockup
    if (worker.stdout) {
      (worker.stdout as any).setDefaultEncoding?.('utf-8');
    }

    worker.stdout?.on('data', (chunk: Buffer | string) => {
      buffer += chunk.toString();
      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        if (!line) continue;
        const cmd = line[0];
        const payload = line.slice(2);

        if (cmd === 'D') {
          try {
            const raw = Buffer.from(payload, 'base64').toString('utf-8');
            onDataCb(raw);
          } catch {
            //
          }
        } else if (cmd === 'X') {
          onExitCb();
        }
      }
    });

    worker.on('exit', () => onExitCb());

    return {
      onData(cb) {
        onDataCb = cb;
      },
      onExit(cb) {
        onExitCb = cb;
      },
      write(data) {
        if (worker.stdin?.writable) {
          const b64 = Buffer.from(data, 'utf-8').toString('base64');
          worker.stdin.write(`I:${b64}\n`);
        }
      },
      resize(c, r) {
        if (worker.stdin?.writable) {
          worker.stdin.write(`R:${c},${r}\n`);
        }
      },
      pause() {
        worker.stdout?.pause();
      },
      resume() {
        worker.stdout?.resume();
      },
      kill() {
        try {
          worker.kill();
        } catch {
          //
        }
      },
    };
  }

  // Non-Windows / Native Node
  const pty = require('@lydell/node-pty');
  const shell =
    process.platform === 'win32'
      ? process.env.COMSPEC || 'cmd.exe'
      : process.env.SHELL || '/bin/bash';

  const ptyProc = pty.spawn(shell, [], {
    name: 'xterm-256color',
    cols,
    rows,
    cwd,
    env: process.env,
  });

  return {
    onData(cb) {
      ptyProc.onData(cb);
    },
    onExit(cb) {
      ptyProc.onExit(cb);
    },
    write(data) {
      ptyProc.write(data);
    },
    resize(c, r) {
      ptyProc.resize(c, r);
    },
    pause() {
      try {
        ptyProc.pause?.();
      } catch {
        //
      }
    },
    resume() {
      try {
        ptyProc.resume?.();
      } catch {
        //
      }
    },
    kill() {
      ptyProc.kill();
    },
  };
}

export function attachPtyToSocket(
  ws: WsLikeSocket,
  sessionId: string,
  cols = 80,
  rows = 24,
  reset = false,
  cwd?: string,
) {
  let session = sessions.get(sessionId);

  if (reset && session) {
    try {
      session.pty.kill();
    } catch {
      //
    }
    sessions.delete(sessionId);
    session = undefined;
  }

  if (!session) {
    const ptyProc = createPtyProcess(cols, rows, cwd);
    session = {
      pty: ptyProc,
      buffer: [],
      totalBufferLength: 0,
      sockets: new Set(),
    };
    sessions.set(sessionId, session);

    ptyProc.onData((data) => {
      if (!session) return;

      // Store scrollback in bounded array
      session.buffer.push(data);
      session.totalBufferLength += data.length;

      if (session.buffer.length > MAX_HISTORY_CHUNKS) {
        const removed = session.buffer.shift();
        if (removed) session.totalBufferLength -= removed.length;
      }

      // Check socket backpressure before broadcasting
      let maxSocketBuffer = 0;
      for (const client of session.sockets) {
        if (client.readyState === 1) {
          const buffered = client.bufferedAmount || 0;
          if (buffered > maxSocketBuffer) maxSocketBuffer = buffered;

          // Dropping/holding frame write if client socket is congested
          if (buffered < MAX_WS_BUFFERED_AMOUNT) {
            try {
              client.send(data);
            } catch {
              //
            }
          }
        }
      }

      // Backpressure throttle: If sockets are severely backed up, pause stream reading
      if (maxSocketBuffer > MAX_WS_BUFFERED_AMOUNT) {
        session.pty.pause?.();
        setTimeout(() => session?.pty.resume?.(), 50);
      }
    });

    ptyProc.onExit(() => {
      if (!session) return;
      for (const client of session.sockets) {
        if (client.readyState === 1) {
          try {
            client.send('\r\n\x1b[33mShell exited\x1b[0m\r\n');
            client.close();
          } catch {
            //
          }
        }
      }
      sessions.delete(sessionId);
    });
  }

  session.sockets.add(ws);

  // Send initial history on connect without crashing frame size limit
  if (session.buffer.length > 0 && ws.readyState === 1) {
    try {
      // Chunk output replay to prevent WebSocket single-frame max payload crash
      const fullHistory = session.buffer.join('');
      const chunkSize = 16384; // 16KB frames
      for (let i = 0; i < fullHistory.length; i += chunkSize) {
        ws.send(fullHistory.slice(i, i + chunkSize));
      }
    } catch {
      //
    }
  }
}

export function handleBunSocketMessage(
  sessionId: string,
  message: string | Buffer,
) {
  const session = sessions.get(sessionId);
  if (!session) return;

  const text = message.toString();
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed.type === 'resize') {
        session.pty.resize(parsed.cols, parsed.rows);
        return;
      }
    } catch {
      //
    }
  }

  session.pty.write(text);
}

export function handleBunSocketClose(ws: WsLikeSocket, sessionId: string) {
  const session = sessions.get(sessionId);
  if (session) {
    session.sockets.delete(ws);
  }
}
