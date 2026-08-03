// server/routes/sessions.ts
//
// These routes NEVER import from server/adapters/*. They resolve whichever
// harness is active (per workspace) via getActiveAdapter() and call the
// HarnessAdapter interface. Swap opencode for codex/claude and every route
// below keeps working unchanged — that's the whole point of the wrapper.

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';

import { getActiveAdapter } from '@/services/harness/registry';
import type { AeroPart } from '@/services/harness/types';

// reusable schemas for request validation
const querySchema = z.object({
  workspaceId: z.string().min(1, 'workspaceId is required'),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

const sessions = new Hono()
  // GET /api/sessions?workspaceId=...
  .get('/', zValidator('query', querySchema), async (c) => {
    const { workspaceId } = c.req.valid('query');
    const harness = await getActiveAdapter(workspaceId);
    const list = await harness.listSessions();
    return c.json(list);
  })

  // POST /api/sessions?workspaceId=...   body: { title? }
  .post(
    '/',
    zValidator('query', querySchema),
    zValidator(
      'json',
      z.object({
        title: z.string().optional(),
      }),
    ),
    async (c) => {
      const { workspaceId } = c.req.valid('query');
      const body = c.req.valid('json');
      const harness = await getActiveAdapter(workspaceId);
      const session = await harness.createSession({ title: body.title });
      return c.json(session);
    },
  )

  // GET /api/sessions/:id?workspaceId=...
  .get(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');
      const harness = await getActiveAdapter(workspaceId);
      const session = await harness.getSession(id);
      return c.json(session);
    },
  )

  // DELETE /api/sessions/:id?workspaceId=...
  .delete(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');
      const harness = await getActiveAdapter(workspaceId);
      const ok = await harness.deleteSession(id);
      return c.json({ ok });
    },
  )

  // GET /api/sessions/:id/message?workspaceId=...
  .get(
    '/:id/message',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');
      const harness = await getActiveAdapter(workspaceId);
      const messages = await harness.listMessages(id);
      return c.json(messages);
    },
  )

  // POST /api/sessions/:id/message?workspaceId=...   body: { parts, model? }
  .post(
    '/:id/message',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    zValidator(
      'json',
      z.object({
        parts: z.custom<AeroPart[]>(
          (val) => Array.isArray(val),
          'parts must be an array',
        ),
        model: z
          .object({
            providerId: z.string(),
            modelId: z.string(),
          })
          .optional(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');
      const body = c.req.valid('json');

      const harness = await getActiveAdapter(workspaceId);
      const message = await harness.sendMessage(id, body);
      return c.json(message);
    },
  )

  // POST /api/sessions/:id/abort?workspaceId=...
  .post(
    '/:id/abort',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');
      const harness = await getActiveAdapter(workspaceId);
      const ok = await harness.abortSession(id);
      return c.json({ ok });
    },
  )

  // GET /api/sessions/:id/stream?workspaceId=...   (SSE)
  .get(
    '/:id/stream',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    async (c) => {
      const { id: sessionId } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');
      const harness = await getActiveAdapter(workspaceId);

      return streamSSE(c, async (stream) => {
        const controller = new AbortController();
        stream.onAbort(() => controller.abort());

        try {
          for await (const event of harness.streamEvents({
            sessionId,
            signal: controller.signal,
          })) {
            await stream.writeSSE({
              event: event.type,
              data: JSON.stringify(event),
            });
          }
        } catch (err) {
          if (!controller.signal.aborted) throw err;
        }
      });
    },
  );

export default sessions;
export type SessionsRoutes = typeof sessions;
