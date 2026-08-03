// server/index.ts

import { Hono } from 'hono';

import sessions from './routes/sessions';
import workspaces from './routes/workspaces';

const app = new Hono()
  .basePath('/api')
  .route('/sessions', sessions)
  .route('/workspaces', workspaces);

export default app;

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
