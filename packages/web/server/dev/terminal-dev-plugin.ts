import type { Plugin } from 'vite';
import { WebSocketServer } from 'ws';

import { validateWebSocketRequest } from '../../server/lib/terminal/auth';
import { AUTH_CONFIG } from '../../server/lib/terminal/config';
import { attachPtyToSocket } from '../../server/lib/terminal/pty-session.dev';
import { setupFsWebSocket } from '../../server/routes/fs-ws';

export function devWebSocketPlugin(): Plugin {
  return {
    name: 'aero-dev-websocket-router',
    configureServer(viteServer) {
      if (!viteServer.httpServer) return;

      const terminalWss = new WebSocketServer({ noServer: true });
      const fsWss = new WebSocketServer({ noServer: true });

      setupFsWebSocket(fsWss);

      viteServer.httpServer.on('upgrade', (req, socket, head) => {
        let url: URL;
        try {
          url = new URL(req.url ?? '/', 'http://localhost');
        } catch {
          socket.destroy();
          return;
        }

        // 1. Terminal WebSocket Handler
        if (url.pathname === '/ws/terminal') {
          const decision = validateWebSocketRequest(AUTH_CONFIG, {
            host: req.headers.host,
            origin: req.headers.origin,
            token: url.searchParams.get('token'),
          });

          if (!decision.ok) {
            socket.write(
              `HTTP/1.1 ${decision.status} ${decision.reason}\r\n\r\n`,
            );
            socket.destroy();
            return;
          }

          terminalWss.handleUpgrade(req, socket, head, (ws) => {
            const sessionId = url.searchParams.get('sessionId') || 'default';
            const reset = url.searchParams.get('reset') === 'true';
            const cols = Number.parseInt(
              url.searchParams.get('cols') || '80',
              10,
            );
            const rows = Number.parseInt(
              url.searchParams.get('rows') || '24',
              10,
            );
            const cwd = url.searchParams.get('cwd') || undefined;
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            attachPtyToSocket(ws as any, sessionId, cols, rows, reset, cwd);
          });
          return;
        }

        // 2. File System WebSocket Handler
        if (url.pathname === '/ws/fs') {
          fsWss.handleUpgrade(req, socket, head, (ws) => {
            fsWss.emit('connection', ws, req);
          });
          return;
        }

        // Leave unhandled paths for Vite HMR
      });
    },
  };
}
