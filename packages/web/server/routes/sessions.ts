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

import { withPagination } from '../helper';
import { getActiveAdapter } from '../services/harness/registry';
import type {
  AeroConversationTurn,
  AeroMessage,
  AeroPart,
  AeroSessionSummary,
} from '../services/harness/types';

// reusable schemas for request validation
const querySchema = z.object({
  workspaceId: z.string().min(1).optional(),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

function groupMessages(messages: AeroMessage[]): AeroConversationTurn[] {
  const turns: AeroConversationTurn[] = [];

  for (const message of messages) {
    const previous = turns.at(-1);

    if (previous?.role === message.role) {
      previous.parts.push(...message.parts);
      continue;
    }

    turns.push({
      id: message.id,
      role: message.role,
      parts: [...message.parts],
      createdAt: message.createdAt,
    });
  }

  return turns;
}

const sessions = new Hono()
  // GET /api/sessions?workspaceId=...
  .get(
    '/',
    zValidator(
      'query',
      withPagination<typeof querySchema.shape, AeroSessionSummary>(
        querySchema,
      ).extend({
        archived: z.string().optional(),
      }),
    ),
    async (c) => {
      const { workspaceId, cursor, limit, search, searchBy, archived } =
        c.req.valid('query');

      const harness = await getActiveAdapter(workspaceId);

      const result = await harness.listSessions({
        cursor,
        limit,
        search,
        searchBy,
        archived,
      });

      return c.json(result);
    },
  )

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

  // GET /api/sessions/:id/messages?workspaceId=...
  .get(
    '/:id/messages',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');

      const harness = await getActiveAdapter(workspaceId);
      const messages = await harness.listMessages(id);

      return c.json(groupMessages(messages));
    },
  )

  // GET /api/sessions/:id/toc?workspaceId=...
  .get(
    '/:id/toc',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');
      const harness = await getActiveAdapter(workspaceId);
      const items = await harness.listTocs(id);

      // Don't show TOC if there are fewer than 3 items
      if (items.length < 3) return c.json([]);

      return c.json(items);
    },
  )

  // GET /api/sessions/:id/markdown?workspaceId=...
  .get(
    '/:id/markdown',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');

      const harness = await getActiveAdapter(workspaceId);
      const markdown = await harness.messagesToMarkdown(id);

      return c.json(markdown);
    },
  )

  // PATCH /api/sessions/:id/rename?workspaceId=...
  .patch(
    '/:id/rename',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    zValidator(
      'json',
      z.object({
        title: z.string(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');
      const body = c.req.valid('json');

      const harness = await getActiveAdapter(workspaceId);
      const session = await harness.renameSession({
        sessionId: id,
        title: body.title,
      });

      return c.json(session);
    },
  )

  // PATCH /api/sessions/:id/archive?workspaceId=...
  .patch(
    '/:id/archive',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');

      const harness = await getActiveAdapter(workspaceId);
      const session = await harness.archiveSession(id);

      return c.json(session);
    },
  )

  // PATCH /api/sessions/:id/unarchive?workspaceId=...
  .patch(
    '/:id/unarchive',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');

      const harness = await getActiveAdapter(workspaceId);
      const session = await harness.unarchiveSession(id);

      return c.json(session);
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
