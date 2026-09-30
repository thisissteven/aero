import type { Plugin } from 'vite';
import { WebSocketServer, WebSocket as WsClient } from 'ws';
import { validateWebSocketRequest } from '../../server/lib/terminal/auth';
import { AUTH_CONFIG } from '../../server/lib/terminal/config';
import { attachPtyToSocket } from '../../server/lib/terminal/pty-session.dev';
import { setupFsWebSocket } from '../../server/routes/fs-ws';
import { getPreviewTarget } from '../lib/preview/store';
import {
  extractPreviewIdFromHost,
  extractPreviewIdFromPath,
  extractPreviewRestPath,
  resolvePreviewWebSocketUrl,
} from '../lib/preview/websocket';

export function devWebSocketPlugin(): Plugin {
  return {
    name: 'aero-dev-websocket-router',
    configureServer(viteServer) {
      if (!viteServer.httpServer) return;

      const terminalWss = new WebSocketServer({ noServer: true });
      const fsWss = new WebSocketServer({ noServer: true });
      const previewWss = new WebSocketServer({ noServer: true });

      setupFsWebSocket(fsWss);

      viteServer.httpServer.on('upgrade', (req, socket, head) => {
        let url: URL;
        try {
          url = new URL(req.url ?? '/', 'http://localhost');
        } catch {
          socket.destroy();
          return;
        }

        // 0. Preview WebSocket Handler (interactive proxied sites)
        const previewId =
          extractPreviewIdFromHost((req.headers.host ?? '').split(':')[0]) ??
          extractPreviewIdFromPath(url.pathname);

        if (previewId) {
          const target = getPreviewTarget(previewId);

          if (!target || target.kind !== 'http') {
            socket.write('HTTP/1.1 404 Not Found\r\n\r\n');
            socket.destroy();
            return;
          }

          const restPath = extractPreviewIdFromPath(url.pathname)
            ? extractPreviewRestPath(url.pathname, previewId)
            : `${url.pathname}${url.search}`;

          const upstreamUrl = resolvePreviewWebSocketUrl(
            target,
            restPath,
            `http://${req.headers.host}${req.url}`,
          );

          if (!upstreamUrl) {
            socket.write('HTTP/1.1 400 Bad Request\r\n\r\n');
            socket.destroy();
            return;
          }

          const pending: Array<{ data: unknown; isBinary: boolean }> = [];
          let client: import('ws').WebSocket | null = null;
          const upstream = new WsClient(upstreamUrl);

          upstream.on('message', (data, isBinary) => {
            client?.send(data as never, { binary: isBinary });
          });
          upstream.on('close', () => client?.close());
          upstream.on('error', () => socket.destroy());

          upstream.on('open', () => {
            previewWss.handleUpgrade(req, socket, head, (ws) => {
              client = ws;

              for (const queued of pending.splice(0)) {
                ws.send(queued.data as never, { binary: queued.isBinary });
              }

              ws.on('message', (data, isBinary) => {
                if (upstream.readyState === WsClient.OPEN) {
                  upstream.send(data, { binary: isBinary });
                } else {
                  pending.push({ data, isBinary });
                }
              });
              ws.on('close', () => upstream.close());
            });
          });
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
