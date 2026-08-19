// server/index.ts

import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';

import { initProxyConfig } from './proxy-loader';
import poolRoutes from './routes/pool';
import sessions from './routes/sessions';
import terminalRoutes from './routes/terminal';
import workspaces from './routes/workspaces';

initProxyConfig();

const app = new Hono()
  .basePath('/api')
  .route('/sessions', sessions)
  .route('/workspaces', workspaces)
  .route('/pool', poolRoutes)
  .route('/terminal', terminalRoutes);

app.onError((err, c) => {
  console.error(`[Error] ${c.req.method} ${c.req.url}:`, err);

  // Handle Hono's built-in HTTP Exceptions (e.g., throw new HTTPException(400, { message: 'Invalid ID' }))
  if (err instanceof HTTPException) {
    return c.json(
      {
        success: false,
        message: err.message,
      },
      err.status,
    );
  }

  // Handle standard thrown Errors or unexpected crashes
  return c.json(
    {
      success: false,
      message: err.message || 'Internal Server Error',
      // Useful for debugging in development; consider omitting or hiding in production
      ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
    },
    500,
  );
});

export default app;
export const server = {
  fetch: app.fetch,
};

// Export the type, not the instance — this is what `hc<AppType>()` needs
// on the frontend for a fully-typed client.
export type AppType = typeof app;

// --- frontend usage (packages/web/src/app) ---------------------------------
//
// import { hc } from "hono/client";
// import type { AppType } from "../../server";
//
// export const client = hc<AppType>("/");
//
// // identical call shape no matter which harness is active server-side:
// const res = await client.api.sessions[":id"].message.$get({
//   param: { id: sessionId },
// });
//
// // streaming: plain EventSource against the SSE route, since hono/client
// // doesn't type SSE endpoints specially
// const es = new EventSource(`/api/sessions/${sessionId}/stream`);
// es.addEventListener("message.part.updated", (e) => {
//   const event = JSON.parse(e.data);
//   // ... feed into chat-message / chat-tool components
// });
