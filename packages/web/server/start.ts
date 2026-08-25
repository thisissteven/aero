/* eslint-disable @typescript-eslint/no-explicit-any */

import { serve, type ServerWebSocket } from 'bun';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';

import api from './index';
import { getPreviewTarget } from './lib/preview/store';
import { validateWebSocketRequest } from './lib/terminal/auth';
import { AUTH_CONFIG } from './lib/terminal/config';
import {
  attachPtyToSocket,
  handleBunSocketClose,
  handleBunSocketMessage,
  type WsLikeSocket,
} from './lib/terminal/pty-session';

process.on('uncaughtException', (err: any) => {
  if (
    err?.code === 'ERR_SOCKET_CLOSED' ||
    err?.message?.includes('Socket is closed')
  ) {
    console.warn('[Server] Caught async PTY socket close event:', err.message);
    return;
  }

  console.error('[Server] Uncaught Exception:', err);
});

const app = new Hono();

app.route('/', api);

app.use(
  '/*',
  serveStatic({
    root: './dist',
  }),
);

app.get(
  '*',
  serveStatic({
    path: './dist/index.html',
  }),
);

type TerminalSocketData = {
  sessionId: string;
  cols: number;
  rows: number;
  reset: boolean;
  cwd?: string;
};

function adaptBunSocket(ws: ServerWebSocket<TerminalSocketData>): WsLikeSocket {
  return {
    readyState: ws.readyState,
    send(data) {
      ws.send(data);
    },
    close(code, reason) {
      ws.close(code, reason);
    },
  };
}

/**
 * Production preview requests use:
 *
 *   <id>.preview.localhost:3000/foo
 *
 * But the Hono preview router is mounted at:
 *
 *   /api/preview/p/:proxyId/*
 *
 * Rewrite the request path internally before handing it to Hono.
 *
 * IMPORTANT:
 * We keep the original preview hostname in the URL.
 * proxyRequest() uses that hostname to calculate previewOrigin.
 */
function rewritePreviewHostRequest(req: Request): Request {
  const url = new URL(req.url);

  const match = url.hostname.match(/^([a-f0-9]{32})\.preview\.localhost$/i);

  if (!match) {
    return req;
  }

  const proxyId = match[1];

  /*
   * Make sure the target still exists before rewriting.
   * This also avoids treating arbitrary preview.localhost
   * subdomains as application routes.
   */
  if (!getPreviewTarget(proxyId)) {
    return req;
  }

  const originalPath = url.pathname || '/';

  const previewPath = `/api/preview/p/${proxyId}${
    originalPath === '/' ? '/' : originalPath
  }`;

  url.pathname = previewPath;

  /*
   * Keep:
   *
   *   http://<id>.preview.localhost:3000
   *
   * as the request origin.
   *
   * Only the pathname is changed.
   */
  return new Request(url, req);
}

async function listenWithRetry(basePort: number, maxAttempts = 10) {
  let currentPort = basePort;

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const serverInstance = serve<TerminalSocketData>({
        port: currentPort,
        reusePort: true,

        async fetch(req, server) {
          const url = new URL(req.url);

          /*
           * --------------------------------------------------
           * Production preview hostname
           * --------------------------------------------------
           *
           * <id>.preview.localhost:3000/*
           *
           * -> /api/preview/p/<id>/*
           *
           * This MUST happen before:
           *
           *   serveStatic()
           *   SPA fallback
           *
           * otherwise production serves Aero's index.html.
           */
          const previewRequest = rewritePreviewHostRequest(req);

          if (previewRequest !== req) {
            return app.fetch(previewRequest, server);
          }

          /*
           * Terminal websocket.
           */
          if (
            url.pathname === '/ws/terminal' ||
            url.pathname === '/api/terminal/ws'
          ) {
            const decision = validateWebSocketRequest(AUTH_CONFIG, {
              host: req.headers.get('host') ?? undefined,
              origin: req.headers.get('origin') ?? undefined,
              token: url.searchParams.get('token'),
            });

            if (!decision.ok) {
              return new Response(decision.reason, {
                status: decision.status,
              });
            }

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

            const upgraded = server.upgrade(req, {
              data: {
                sessionId,
                cols,
                rows,
                reset,
                cwd,
              },
            });

            return upgraded
              ? undefined
              : new Response('Upgrade failed', {
                  status: 400,
                });
          }

          return app.fetch(req, server);
        },

        websocket: {
          open(ws) {
            const { sessionId, cols, rows, reset, cwd } = ws.data;

            const socketAdapter = adaptBunSocket(ws);

            attachPtyToSocket(socketAdapter, sessionId, cols, rows, reset, cwd);
          },

          message(ws, message) {
            handleBunSocketMessage(ws.data.sessionId, message.toString());
          },

          close(ws) {
            const socketAdapter = adaptBunSocket(ws);

            handleBunSocketClose(socketAdapter, ws.data.sessionId);
          },
        },
      });

      return serverInstance;
    } catch (err: any) {
      if (err?.code === 'EADDRINUSE') {
        console.warn(
          `[start] Port ${currentPort} in use/locked by OS, trying port ${currentPort + 1}...`,
        );

        currentPort++;
      } else {
        throw err;
      }
    }
  }

  throw new Error(
    `Could not find an available port starting from ${basePort}.`,
  );
}

const DESIRED_PORT = Number(process.env.PORT) || 3000;

const server = await listenWithRetry(DESIRED_PORT);

console.log(`Server listening on http://localhost:${server.port}`);

const shutdown = () => {
  console.log('\nShutting down server...');

  server.stop(true);
  process.exit(0);
};

process.on('SIGINT', shutdown);

process.on('SIGTERM', shutdown);
