import type { Plugin } from 'vite';
import { WebSocketServer } from 'ws';

import { validateWebSocketRequest } from '../lib/terminal/auth';
import { AUTH_CONFIG } from '../lib/terminal/config';
import { attachPtyToSocket } from '../lib/terminal/pty-session';

export function terminalDevPlugin(): Plugin {
  return {
    name: 'aero-terminal-dev-ws',
    configureServer(viteServer) {
      const wss = new WebSocketServer({ noServer: true });

      viteServer.httpServer?.on('upgrade', (req, socket, head) => {
        let url: URL;
        try {
          url = new URL(req.url ?? '/', 'http://localhost');
        } catch {
          socket.destroy();
          return;
        }
        if (url.pathname !== '/ws/terminal') return; // let Vite HMR own everything else

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

        wss.handleUpgrade(req, socket, head, (ws) => {
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
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          attachPtyToSocket(ws as any, sessionId, cols, rows, reset);
        });
      });
    },
  };
}
