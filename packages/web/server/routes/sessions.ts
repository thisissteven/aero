// server/routes/sessions.ts

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { z } from 'zod';

import { getSessionEventHub } from '@/server/services/sessions/session-event-hub';
import {
  listArchivedSessionsAcrossAdapters,
  listSessionsAcrossAdapters,
} from '@/server/services/sessions/sessions-merger';
import { createStandaloneWorkspace } from '@/server/storage/workspaces';

import { groupMessages, withPagination } from '../helper';
import { getActiveAdapter, getAllAdapters } from '../services/harness/registry';
import type { AeroPartRequest, AeroTocItem } from '../services/harness/types';

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
});

const sessions = new Hono()
  // GET /api/sessions/merged?directory=...&cursor=...&limit=...&search=...
  .get(
    '/merged',
    zValidator('query', withPagination(z.object())),
    async (c) => {
      const { cursor, limit, search, directory } = c.req.valid('query');
      const adapters = await getAllAdapters();

      const result = await listSessionsAcrossAdapters(adapters, {
        cursor,
        limit,
        search,
        directory,
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

  // POST /api/sessions/:id/reply-to-question?harnessId=...
  .post(
    '/:id/reply-to-question',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator(
      'json',
      z.object({
        requestId: z.string(),
        answers: z.array(z.array(z.string())),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');
      const { requestId, answers } = c.req.valid('json');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.getSession(id);
      const ok = await harness.replyToQuestion(
        requestId,
        answers,
        session.workspace,
      );
      return c.json({ ok });
    },
  )

  // POST /api/sessions/:id/reject-question?harnessId=...
  .post(
    '/:id/reject-question',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator(
      'json',
      z.object({
        requestId: z.string(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');
      const { requestId } = c.req.valid('json');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.getSession(id);
      const ok = await harness.rejectQuestion(requestId, session.workspace);
      return c.json({ ok });
    },
  )

  // GET /api/sessions/:id/questions?harnessId=...
  .get(
    '/:id/questions',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.getSession(id);
      const questions = await harness.listQuestions(session.workspace);

      return c.json(questions);
    },
  )

  // GET /api/sessions/:id/status?harnessId=...
  .get(
    '/:id/status',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.getSession(id);
      const status = await harness.getSessionStatus(session.workspace);
      return c.json(status);
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

  // GET /api/sessions/:id/messages/:messageId?harnessId=...
  .get(
    '/:id/messages/:messageId',
    zValidator(
      'param',
      idParamSchema.extend({
        messageId: z.string(),
      }),
    ),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id, messageId } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const message = await harness.getSessionMessage(id, messageId);

      return c.json(message);
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

  // GET /api/sessions/:id/context?harnessId=...
  .get(
    '/:id/context',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const context = await harness.getSessionContext(id);

      return c.json(context);
    },
  )

  // GET /api/sessions/:id/diff?harnessId=...&messageId=...&directory=...
  .get(
    '/:id/diff',
    zValidator('param', idParamSchema),
    zValidator(
      'query',
      harnessQuerySchema.extend({
        messageId: z.string(),
        directory: z.string(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId, messageId, directory } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const todos = await harness.getSessionDiff({
        sessionID: id,
        messageID: messageId,
        directory: directory,
      });

      return c.json(todos);
    },
  )

  // GET /api/sessions/:id/children?harnessId=...
  .get(
    '/:id/children',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const todos = await harness.listSessionChildren(id);

      return c.json(todos);
    },
  )

  // GET /api/sessions/:id/todos?harnessId=...
  .get(
    '/:id/todos',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const todos = await harness.listTodos(id);

      return c.json(todos);
    },
  )

  // GET /api/sessions/:id/model?harnessId=...
  .patch(
    '/:id/model',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator(
      'json',
      z.object({
        model: z.string(),
        directory: z.string().optional(),
      }),
    ),
    async (c) => {
      const { harnessId } = c.req.valid('query');
      const { model, directory } = c.req.valid('json');

      const harness = await getActiveAdapter(harnessId);
      const todos = await harness.updateActiveModel(model, directory);

      return c.json(todos);
    },
  )

  .get(
    '/:id/any',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const any = await harness.any(id);

      return c.json(any);
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
      const session = await harness.getSession(id);
      const items = await harness.listTocs(id);

      const tocs = [] as AeroTocItem[];

      for (const item of items) {
        if (session.revert?.messageID === item.id) break;
        tocs.push(item);
      }

      if (tocs.length < 3) return c.json([]);

      return c.json(tocs);
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

  // POST /api/sessions/:id/restore?harnessId=...
  .post(
    '/:id/restore',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),

    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.unrevertSession(id);
      return c.json(session);
    },
  )

  // POST /api/sessions/:id/revert?harnessId=...
  .post(
    '/:id/revert',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator(
      'json',
      z.object({
        messageId: z.string(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');
      const body = c.req.valid('json');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.revertSession(id, body.messageId);
      return c.json(session);
    },
  )

  // POST /api/sessions/:id/fork?harnessId=...
  .post(
    '/:id/fork',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator(
      'json',
      z.object({
        messageId: z.string(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');
      const body = c.req.valid('json');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.forkSession(id, body.messageId);
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
        system: z.string().optional(),
        agent: z.string().optional(),
      }),
    ),
    async (c) => {
      const { id } = c.req.valid('param');
      const { harnessId } = c.req.valid('query');
      const body = c.req.valid('json');

      const harness = await getActiveAdapter(harnessId);
      const session = await harness.getSession(id);
      const ok = await harness.sendMessage(id, body, session.workspace);
      return c.json(ok);
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

      console.log('[ABORT REQUEST]', {
        sessionId: id,
        harnessId,
        time: Date.now(),
      });

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

      const hub = getSessionEventHub(harnessId, () =>
        getActiveAdapter(harnessId),
      );

      return streamSSE(c, async (stream) => {
        const controller = new AbortController();

        stream.onAbort(() => {
          console.log('[ABORT REQUEST di streamSSE stream.onAbort]', {
            harnessId,
            time: Date.now(),
          });
          controller.abort();
        });

        const events = hub.subscribe(sessionId);
        const iterator = events[Symbol.asyncIterator]();

        try {
          await hub.waitUntilReady();

          if (controller.signal.aborted) {
            return;
          }

          await stream.writeSSE({
            event: 'ready',
            data: '',
          });

          while (!controller.signal.aborted) {
            const result = await iterator.next();

            if (result.done) {
              break;
            }

            await stream.writeSSE({
              event: result.value.type,
              data: JSON.stringify(result.value),
            });
          }
        } finally {
          console.log('[ABORT REQUEST di streamSSE finally]', {
            harnessId,
            time: Date.now(),
          });
          controller.abort();
          await iterator.return?.();
        }
      });
    },
  );

export default sessions;
export type SessionsRoutes = typeof sessions;
