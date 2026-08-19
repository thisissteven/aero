import { serve } from 'bun';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';

import api from './index';
import { validateWebSocketRequest } from './lib/terminal/auth';
import { AUTH_CONFIG } from './lib/terminal/config';
import { createPtySession, type PtyProcess } from './lib/terminal/pty-session';

const app = new Hono();

app.route('/', api);

app.use('/*', serveStatic({ root: './dist' }));
app.get('*', serveStatic({ path: './dist/index.html' }));

type TerminalSocketData = { cols: number; rows: number; pty?: PtyProcess };

serve<TerminalSocketData>({
  port: 3000,
  fetch(req, server) {
    const url = new URL(req.url);

    if (url.pathname === '/ws/terminal') {
      const decision = validateWebSocketRequest(AUTH_CONFIG, {
        host: req.headers.get('host') ?? undefined,
        origin: req.headers.get('origin') ?? undefined,
        token: url.searchParams.get('token'),
      });
      if (!decision.ok) {
        return new Response(decision.reason, { status: decision.status });
      }

      const cols = Number.parseInt(url.searchParams.get('cols') || '80', 10);
      const rows = Number.parseInt(url.searchParams.get('rows') || '24', 10);
      const upgraded = server.upgrade(req, {
        data: { cols, rows },
      });
      return upgraded
        ? undefined
        : new Response('Upgrade failed', { status: 400 });
    }

    return app.fetch(req, server);
  },
  websocket: {
    open(ws) {
      const pty = createPtySession(ws.data.cols, ws.data.rows);
      ws.data.pty = pty;
      pty.onData((data) => ws.send(data));
      pty.onExit(({ exitCode }) => {
        ws.send(`\r\n\x1b[33mShell exited (code: ${exitCode})\x1b[0m\r\n`);
        ws.close();
      });
    },
    message(ws, message) {
      const pty = ws.data.pty;
      if (!pty) return;
      const text = message.toString();
      if (text.startsWith('{')) {
        try {
          const msg = JSON.parse(text);
          if (msg.type === 'resize') return pty.resize(msg.cols, msg.rows);
        } catch {
          /* raw input */
        }
      }
      pty.write(text);
    },
    close(ws) {
      ws.data.pty?.kill();
    },
  },
});

// eslint-disable-next-line no-console
console.log('http://localhost:3000');
