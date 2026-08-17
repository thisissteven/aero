/**
 * Standalone terminal WebSocket server for development.
 *
 * During `vite dev`, the Hono dev-server adapter has no WebSocket support,
 * so the terminal's `upgradeWebSocket` call silently fails. This file runs
 * the terminal route under a real `Bun.serve()` with its native `websocket`
 * handler on a dedicated port (default 3001). Vite's `server.proxy` forwards
 * `/api/terminal/ws` here transparently.
 *
 * In production (`bun server/start.ts`) this file is not used — the main
 * server already has `Bun.serve({ websocket })`.
 */

import { serve } from 'bun';
import { Hono } from 'hono';
import { websocket } from 'hono/bun';

import terminal from './routes/terminal';

const TERMINAL_PORT = Number(process.env.TERMINAL_PORT) || 3001;

const app = new Hono().basePath('/api').route('/terminal', terminal);

serve({
  fetch: app.fetch,
  websocket,
  port: TERMINAL_PORT,
});

// eslint-disable-next-line no-console
console.log(
  `[terminal-server] WebSocket server listening on http://localhost:${TERMINAL_PORT}`,
);
