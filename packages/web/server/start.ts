/* eslint-disable @typescript-eslint/no-explicit-any */

import { serve, type ServerWebSocket } from 'bun';
import { Hono } from 'hono';
import { serveStatic } from 'hono/bun';

import { opencodePool } from '@/server/adapters/opencode/pool';

import api from './index';
import { resolveRoot } from './lib/fs-ws/fs-core';
import { handleFsSocketMessage } from './lib/fs-ws/fs-ws-bun';
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
  kind: 'terminal';
  sessionId: string;
  cols: number;
  rows: number;
  reset: boolean;
  cwd?: string;
};

type FsSocketData = {
  kind: 'fs';
  root: string;
};

type SocketData = TerminalSocketData | FsSocketData;

function adaptBunSocket(ws: ServerWebSocket<SocketData>): WsLikeSocket {
  return {
    readyState: ws.readyState,
    bufferedAmount: ws.getBufferedAmount?.(),
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
      const serverInstance = serve<SocketData>({
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
          if (url.pathname === '/ws/terminal') {
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
                kind: 'terminal',
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

          /*
           * File system websocket.
           */
          if (url.pathname === '/ws/fs') {
            const rawRoot = url.searchParams.get('root');

            if (!rawRoot) {
              return new Response('missing root', { status: 400 });
            }

            let resolvedRoot: string;

            try {
              resolvedRoot = await resolveRoot(rawRoot);
            } catch {
              return new Response('invalid root directory', {
                status: 400,
              });
            }

            const upgraded = server.upgrade(req, {
              data: { kind: 'fs', root: resolvedRoot },
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
            if (ws.data.kind === 'fs') {
              // No session state to initialize — root lives on ws.data.
              return;
            }

            const { sessionId, cols, rows, reset, cwd } = ws.data;

            const socketAdapter = adaptBunSocket(ws);

            attachPtyToSocket(socketAdapter, sessionId, cols, rows, reset, cwd);
          },

          message(ws, message) {
            if (ws.data.kind === 'fs') {
              void handleFsSocketMessage(
                adaptBunSocket(ws),
                { root: ws.data.root },
                message.toString(),
              );
              return;
            }

            handleBunSocketMessage(ws.data.sessionId, message.toString());
          },

          close(ws) {
            if (ws.data.kind === 'fs') {
              // No session state to tear down.
              return;
            }

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

// Pre-initialize OpenCode server pool before opening Bun listener
console.log('[start] Initializing OpenCode server pool...');
try {
  await opencodePool.init();
  const stats = await opencodePool.getStats();
  console.log(
    `[start] OpenCode pool initialized successfully on port ${stats.nodes[0]?.port ?? 'N/A'}`,
  );
} catch (err) {
  console.error('[start] Failed to pre-warm OpenCode pool:', err);
}

const DESIRED_PORT = Number(process.env.PORT) || 3000;

const server = await listenWithRetry(DESIRED_PORT);

console.log(`Server listening on http://localhost:${server.port}`);

const shutdown = async (signal: string) => {
  console.log(
    `\nReceived ${signal}. Shutting down server and OpenCode pool...`,
  );

  server.stop(true);
  try {
    await opencodePool.shutdown();
    console.log('[start] OpenCode pool shutdown cleanly.');
  } catch (err) {
    console.error('[start] Error during pool shutdown:', err);
  } finally {
    process.exit(0);
  }
};

process.on('SIGINT', () => void shutdown('SIGINT'));

process.on('SIGTERM', () => void shutdown('SIGTERM'));
