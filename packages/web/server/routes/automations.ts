// server/routes/automations.ts
//
// Workspace automations (scheduled tasks). Routes validate input, delegate to
// `services/automations`, and map errors to status codes.

import { zValidator } from '@hono/zod-validator';
import { type Context, Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';

import {
  AutomationError,
  list,
  remove,
  run,
  status,
  subscribe,
  upsert,
} from '@/server/services/automations';
import type { AutomationInput } from '@/server/services/automations/store';

const workspaceIdParamSchema = z.object({
  workspaceId: z.string().min(1),
});

const taskParamSchema = z.object({
  workspaceId: z.string().min(1),
  taskId: z.string().min(1),
});

const upsertBodySchema = z.object({
  task: z.custom<AutomationInput>(
    (value) => Boolean(value) && typeof value === 'object',
    'task payload is required',
  ),
});

function respondWithError(c: Context, error: unknown, fallback: string) {
  if (error instanceof AutomationError) {
    return c.json({ error: error.message }, error.statusCode as 400);
  }
  const message = error instanceof Error ? error.message : fallback;
  console.error('[Automations]', message);
  return c.json({ error: message || fallback }, 500);
}

const automations = new Hono()
  .get('/status', async (c) => {
    try {
      return c.json(await status());
    } catch (error) {
      return respondWithError(c, error, 'Failed to resolve automation status');
    }
  })

  // SSE stream of automation run events.
  .get('/events', (c) =>
    streamSSE(c, async (stream) => {
      const controller = new AbortController();
      stream.onAbort(() => controller.abort());

      const unsubscribe = subscribe((event) => {
        void stream
          .writeSSE({ event: event.type, data: JSON.stringify(event) })
          .catch(() => undefined);
      });

      let lastWrite = Date.now();
      const heartbeat = setInterval(() => {
        if (controller.signal.aborted) return;
        if (Date.now() - lastWrite < 25_000) return;
        lastWrite = Date.now();
        void stream
          .writeSSE({ event: 'ping', data: '' })
          .catch(() => undefined);
      }, 25_000);

      try {
        await stream.writeSSE({ event: 'ready', data: '' });
        lastWrite = Date.now();
        while (!controller.signal.aborted) {
          await stream.sleep(1_000);
        }
      } finally {
        clearInterval(heartbeat);
        unsubscribe();
        controller.abort();
      }
    }),
  )

  .get(
    '/:workspaceId',
    zValidator('param', workspaceIdParamSchema),
    async (c) => {
      const { workspaceId } = c.req.valid('param');
      try {
        return c.json({ tasks: await list(workspaceId) });
      } catch (error) {
        return respondWithError(c, error, 'Failed to load automations');
      }
    },
  )

  .put(
    '/:workspaceId',
    zValidator('param', workspaceIdParamSchema),
    zValidator('json', upsertBodySchema),
    async (c) => {
      const { workspaceId } = c.req.valid('param');
      const { task } = c.req.valid('json');
      try {
        return c.json(await upsert(workspaceId, task));
      } catch (error) {
        return respondWithError(c, error, 'Failed to save automation');
      }
    },
  )

  .delete(
    '/:workspaceId/:taskId',
    zValidator('param', taskParamSchema),
    async (c) => {
      const { workspaceId, taskId } = c.req.valid('param');
      try {
        return c.json({ tasks: await remove(workspaceId, taskId) });
      } catch (error) {
        return respondWithError(c, error, 'Failed to delete automation');
      }
    },
  )

  .post(
    '/:workspaceId/:taskId/run',
    zValidator('param', taskParamSchema),
    async (c) => {
      const { workspaceId, taskId } = c.req.valid('param');
      try {
        return c.json({ ok: true, ...(await run(workspaceId, taskId)) });
      } catch (error) {
        return respondWithError(c, error, 'Failed to run automation');
      }
    },
  );

export default automations;
export type AutomationRoutes = typeof automations;
