// server/routes/sessions.ts

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';

import {
  listArchivedSessionsAcrossAdapters,
  listSessionsAcrossAdapters,
} from '@/server/services/sessions/sessions-merger';
import { createStandaloneWorkspace } from '@/server/storage/workspaces';

import {
  groupMessages,
  waitForMessagePersistence,
  withPagination,
} from '../helper';
import { getActiveAdapter, getAllAdapters } from '../services/harness/registry';
import type { AeroPartRequest } from '../services/harness/types';

const harnessQuerySchema = z.object({
  harnessId: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

const bulkIdsQuerySchema = z.object({
  ids: z
    .string()
    .min(1)
    .transform((val) =>
      val
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    )
    .pipe(z.array(z.string().min(1)).min(1, 'At least one ID is required')),
});

const createSessionInputSchema = z.object({
  title: z.string().optional(),
  directory: z.string().optional(),
  harnessId: z.string().optional(),
  parts: z.custom<AeroPartRequest[]>(
    (val) => Array.isArray(val),
    'parts must be an array',
  ),
  model: z
    .object({
      providerId: z.string(),
      modelId: z.string(),
    })
    .optional(),
});

const sessions = new Hono()
  // GET /api/sessions/merged?directory=...&cursor=...&limit=...&search=...
  .get(
    '/merged',
    zValidator('query', withPagination(z.object())),
    async (c) => {
      const { cursor, limit, search } = c.req.valid('query');
      const adapters = await getAllAdapters();

      const result = await listSessionsAcrossAdapters(adapters, {
        cursor,
        limit,
        search,
      });

      return c.json(result);
    },
  )

  // GET /api/sessions?harnessId=...&cursor=...&limit=...&search=...
  .get(
    '/',
    zValidator('query', withPagination(harnessQuerySchema)),
    async (c) => {
      const { harnessId, cursor, limit, search } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);

      const result = await harness.listSessions({
        cursor,
        limit,
        search,
      });

      return c.json(result);
    },
  )

  // GET /api/sessions/archived/merged?directory=...
  .get('/archived/merged', async (c) => {
    const adapters = await getAllAdapters();

    const result = await listArchivedSessionsAcrossAdapters(adapters);

    return c.json(result);
  })

  // GET /api/sessions/archived?harnessId=...
  .get('/archived', zValidator('query', harnessQuerySchema), async (c) => {
    const { harnessId } = c.req.valid('query');

    const harness = await getActiveAdapter(harnessId);

    const result = await harness.listArchivedSessions();

    return c.json(result);
  })

  // POST /api/sessions?harnessId=... body: { title?, harnessId?, directory?, parts, model? }
  .post(
    '/',
    zValidator('query', harnessQuerySchema),
    zValidator('json', createSessionInputSchema),
    async (c) => {
      const { harnessId: queryHarness } = c.req.valid('query');
      const body = c.req.valid('json');

      // Body harness takes precedence over query param, falling back to default
      const harnessId = body.harnessId || queryHarness;
      const harness = await getActiveAdapter(harnessId);

      let directory = body.directory;

      // Fall back to a newly created .aero/workspaces/<uuid> workspace if directory is undefined
      if (!directory) {
        const workspace = await createStandaloneWorkspace(body.title);
        directory = workspace.directory;
      }

      const session = await harness.createSession({
        title: body.title,
        directory,
        harnessId,
      });

      await harness.sendMessage(session.id, {
        parts: body.parts,
        model: body.model,
      });

      await waitForMessagePersistence(harness, session.id);

      return c.json(session);
    },
  )

  // GET /api/sessions/:id?harnessId=...
  .get(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.getSession(id);
      return c.json(session);
    },
  )

  // DELETE /api/sessions/:id?harnessId=...
  .delete(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const ok = await harness.deleteSession(id);
      return c.json({ ok });
    },
  )

  // DELETE /api/sessions/delete/bulk?harnessId=...
  .delete(
    '/delete/bulk',
    zValidator('query', harnessQuerySchema.extend(bulkIdsQuerySchema.shape)),
    async (c) => {
      const { harnessId, ids } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const ok = await harness.deleteBulkSessions(ids);
      return c.json(ok);
    },
  )

  // GET /api/sessions/:id/messages?harnessId=...
  .get(
    '/:id/messages',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const messages = await harness.listMessages(id);

      return c.json(groupMessages(messages));
    },
  )

  // GET /api/sessions/:id/toc?harnessId=...
  .get(
    '/:id/toc',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const items = await harness.listTocs(id);

      if (items.length < 3) return c.json([]);

      return c.json(items);
    },
  )

  // GET /api/sessions/:id/share?harnessId=...
  .get(
    '/:id/share',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.shareSession(id);

      return c.json(session);
    },
  )

  // GET /api/sessions/:id/unshare?harnessId=...
  .get(
    '/:id/unshare',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.unshareSession(id);

      return c.json(session);
    },
  )

  // GET /api/sessions/:id/markdown?harnessId=...
  .get(
    '/:id/markdown',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const markdown = await harness.messagesToMarkdown(id);

      return c.json(markdown);
    },
  )

  // PATCH /api/sessions/:id/rename?harnessId=...
  .patch(
    '/:id/rename',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator(
      'json',
      z.object({
        title: z.string(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');
      const body = c.req.valid('json');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.renameSession({
        sessionId: id,
        title: body.title,
      });

      return c.json(session);
    },
  )

  // PATCH /api/sessions/archive/bulk?harnessId=...
  .patch(
    '/archive/bulk',
    zValidator('query', harnessQuerySchema.extend(bulkIdsQuerySchema.shape)),
    async (c) => {
      const { harnessId, ids } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const ok = await harness.archiveBulkSessions(ids);

      return c.json(ok);
    },
  )

  // PATCH /api/sessions/:id/archive?harnessId=...
  .patch(
    '/:id/archive',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.archiveSession(id);

      return c.json(session);
    },
  )

  // PATCH /api/sessions/unarchive/bulk?harnessId=...
  .patch(
    '/unarchive/bulk',
    zValidator('query', harnessQuerySchema.extend(bulkIdsQuerySchema.shape)),
    async (c) => {
      const { harnessId, ids } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const ok = await harness.unarchiveBulkSessions(ids);

      return c.json(ok);
    },
  )

  // PATCH /api/sessions/:id/unarchive?harnessId=...
  .patch(
    '/:id/unarchive',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.unarchiveSession(id);

      return c.json(session);
    },
  )

  // POST /api/sessions/:id/message?harnessId=...
  .post(
    '/:id/message',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator(
      'json',
      z.object({
        parts: z.custom<AeroPartRequest[]>(
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
      const { harnessId } = c.req.valid('query');
      const body = c.req.valid('json');

      const harness = await getActiveAdapter(harnessId);
      const message = await harness.sendMessage(id, body);
      return c.json(message);
    },
  )

  // POST /api/sessions/:id/abort?harnessId=...
  .post(
    '/:id/abort',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const ok = await harness.abortSession(id);
      return c.json({ ok });
    },
  )

  // GET /api/sessions/:id/stream?harnessId=... (SSE)
  .get(
    '/:id/stream',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id: sessionId } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);

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
