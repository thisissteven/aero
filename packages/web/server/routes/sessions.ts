// server/routes/sessions.ts

import { zValidator } from '@hono/zod-validator';
import { type Context, Hono } from 'hono';
import { streamSSE } from 'hono/streaming';
import { produce } from 'immer';
import { z } from 'zod';

import { getSessionEventHub } from '@/server/services/sessions/session-event-hub';
import { expandMessageParts } from '@/server/services/sessions/session-message-part';
import {
  listArchivedSessionsAcrossAdapters,
  listSessionsAcrossAdapters,
} from '@/server/services/sessions/sessions-merger';
import { createStandaloneWorkspace } from '@/server/storage/workspaces';
import { SessionMetadata } from '@/server/types/opencode-sdk';
import { groupMessages, withPagination } from '../helper';
import { getActiveAdapter, getAllAdapters } from '../services/harness/registry';
import type {
  AeroPartUserMessage,
  AeroTocItem,
} from '../services/harness/types';

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const harnessQuerySchema = z.object({
  harnessId: z.string().optional(),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

const messageIdParamSchema = idParamSchema.extend({
  messageId: z.string(),
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

const harnessBulkQuerySchema = harnessQuerySchema.extend(
  bulkIdsQuerySchema.shape,
);

const createSessionSchema = z.object({
  title: z.string().optional(),
  directory: z.string().optional(),
  harnessId: z.string().optional(),
});

const renameSchema = z.object({ title: z.string() });
const messageIdBodySchema = z.object({ messageId: z.string() });

const togglePinnedSchema = z.object({
  messageId: z.string(),
  pinned: z.boolean(),
});

const modelRefSchema = z.object({
  providerId: z.string(),
  modelId: z.string(),
});

const metadataKeyParamSchema = idParamSchema.extend({
  key: z.string().min(1),
});

const patchSessionMetadataSchema = z.object({
  metadata: z.custom<Partial<SessionMetadata>>(
    (val) => val !== null && typeof val === 'object' && !Array.isArray(val),
    'metadata must be an object',
  ),
});

const updateModelSchema = z.object({
  model: z.string(),
  directory: z.string().optional(),
});

const diffQuerySchema = harnessQuerySchema.extend({
  messageId: z.string(),
  directory: z.string(),
});

const replyToPermissionSchema = z.object({
  requestId: z.string(),
  reply: z.enum(['once', 'always', 'reject']).optional(),
});

const replyToQuestionSchema = z.object({
  requestId: z.string(),
  answers: z.array(z.array(z.string())),
});

const rejectQuestionSchema = z.object({ requestId: z.string() });

const compactSchema = z.object({
  modelId: z.string().optional(),
  providerId: z.string().optional(),
});

const filePartSchema = z.object({
  id: z.string().optional(),
  type: z.literal('file'),
  mime: z.string(),
  filename: z.string().optional(),
  url: z.string(),
  source: z.any().optional(),
});

const commandSchema = z.object({
  agent: z.string().optional(),
  model: z.string().optional(),
  arguments: z.string().optional(),
  command: z.string().optional(),
  variant: z.string().optional(),
  system: z.string().optional(),
  parts: z.array(filePartSchema).optional(),
  delivery: z.literal('steer').optional(),
});

const shellSchema = z.object({
  model: modelRefSchema.optional(),
  system: z.string().optional(),
  agent: z.string().optional(),
  command: z.string().optional(),
});

const messageSchema = z.object({
  parts: z.custom<AeroPartUserMessage[]>(
    (val) => Array.isArray(val),
    'parts must be an array',
  ),
  model: modelRefSchema.optional(),
  system: z.string().optional(),
  agent: z.string().optional(),
  variant: z.string().optional(),
  delivery: z.literal('steer').optional(),
});

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Hono's per-route validator typings are lost when we reach across handler
 * boundaries, so we accept an untyped context here and cast the pieces we use.
 */
type AnyContext = Context<any, any, any>;

/** Resolve the active harness adapter from the `harnessId` query param. */
function resolveHarness(c: AnyContext) {
  const { harnessId } = c.req.valid('query') as { harnessId?: string };
  return getActiveAdapter(harnessId);
}

/** Resolve the active harness and load the session referenced by `:id`. */
async function resolveSession(c: AnyContext) {
  const { id } = c.req.valid('param') as { id: string };
  const harness = await resolveHarness(c);
  const session = await harness.getSession(id);
  return { id, harness, session };
}

/** Shared SSE handler for `GET /:id/stream`. */
async function streamSessionEvents(c: AnyContext) {
  const { id: sessionId } = c.req.valid('param') as { id: string };
  const { harnessId } = c.req.valid('query') as { harnessId?: string };

  const hub = getSessionEventHub(harnessId, () => getActiveAdapter(harnessId));

  return streamSSE(c, async (stream) => {
    const controller = new AbortController();
    stream.onAbort(() => controller.abort());

    const events = hub.subscribe(sessionId);
    const iterator = events[Symbol.asyncIterator]();

    let lastWrite = Date.now();
    const heartbeat = setInterval(() => {
      if (controller.signal.aborted) return;
      if (Date.now() - lastWrite < 10_000) return;
      lastWrite = Date.now();
      void stream.writeSSE({ event: 'ping', data: '' });
    }, 10_000);

    try {
      await hub.waitUntilReady();
      if (controller.signal.aborted) return;

      await stream.writeSSE({ event: 'ready', data: '' });
      lastWrite = Date.now();

      while (!controller.signal.aborted) {
        const result = await iterator.next();
        if (result.done) break;
        await stream.writeSSE({
          event: result.value.type,
          data: JSON.stringify(result.value),
        });
        lastWrite = Date.now();
      }
    } finally {
      clearInterval(heartbeat);
      controller.abort();
      try {
        await iterator.return?.();
      } catch {
        //
      }
    }
  });
}

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------

const sessions = new Hono()

  // ------------------------------- Listing -------------------------------

  // GET /api/sessions/merged?directory=&cursor=&limit=&search=
  .get(
    '/merged',
    zValidator(
      'query',
      withPagination(
        z.object({
          archived: z.stringbool().optional(),
          childSessions: z.stringbool().optional(),
          childSessionsOnly: z.stringbool().optional(),
        }),
      ),
    ),
    async (c) => {
      const adapters = await getAllAdapters();
      return c.json(
        await listSessionsAcrossAdapters(adapters, c.req.valid('query')),
      );
    },
  )

  // GET /api/sessions?harnessId=&cursor=&limit=&search=
  .get(
    '/',
    zValidator('query', withPagination(harnessQuerySchema)),
    async (c) => {
      const { cursor, limit, search } = c.req.valid('query');
      const harness = await resolveHarness(c);
      return c.json(await harness.listSessions({ cursor, limit, search }));
    },
  )

  // GET /api/sessions/archived/merged
  .get('/archived/merged', async (c) => {
    const adapters = await getAllAdapters();
    return c.json(await listArchivedSessionsAcrossAdapters(adapters));
  })

  // GET /api/sessions/archived?harnessId=
  .get('/archived', zValidator('query', harnessQuerySchema), async (c) => {
    const harness = await resolveHarness(c);
    return c.json(await harness.listArchivedSessions());
  })

  // --------------------------- Session creation --------------------------

  // POST /api/sessions?harnessId=  body: { title?, harnessId?, directory? }
  .post(
    '/',
    zValidator('query', harnessQuerySchema),
    zValidator('json', createSessionSchema),
    async (c) => {
      const body = c.req.valid('json');
      const { harnessId: queryHarness } = c.req.valid('query');

      // Body harness takes precedence over query param, falling back to default.
      const harnessId = body.harnessId || queryHarness;
      const harness = await getActiveAdapter(harnessId);

      // Fall back to a freshly created standalone workspace if none provided.
      const directory =
        body.directory ||
        (await createStandaloneWorkspace(body.title)).directory;

      return c.json(
        await harness.createSession({
          title: body.title,
          directory,
          harnessId,
        }),
      );
    },
  )

  // ------------------------- Session meta / state ------------------------

  // GET /api/sessions/:id?harnessId=
  .get(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json(await harness.getSession(id));
    },
  )

  // GET /api/sessions/:id/permissions?harnessId=
  .get(
    '/:id/permissions',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { harness, session } = await resolveSession(c);
      return c.json(await harness.listAwaitingPermissions(session.workspace));
    },
  )

  // GET /api/sessions/:id/questions?harnessId=
  .get(
    '/:id/questions',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { harness, session } = await resolveSession(c);
      return c.json(await harness.listQuestions(session.workspace));
    },
  )

  // GET /api/sessions/:id/vcs-info?harnessId=
  .get(
    '/:id/vcs-info',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { harness, session } = await resolveSession(c);
      return c.json(await harness.getVcsInfo(session.workspace));
    },
  )

  // GET /api/sessions/:id/vcs-status?harnessId=
  .get(
    '/:id/vcs-status',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { harness, session } = await resolveSession(c);
      return c.json(await harness.getVcsStatus(session.workspace));
    },
  )

  // GET /api/sessions/:id/status?harnessId=
  .get(
    '/:id/status',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { harness, session } = await resolveSession(c);
      return c.json(await harness.getSessionStatus(session.workspace));
    },
  )

  // ------------------------ Permission / questions -----------------------

  // POST /api/sessions/:id/reply-to-permission?harnessId=
  .post(
    '/:id/reply-to-permission',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', replyToPermissionSchema),
    async (c) => {
      const { harness, session } = await resolveSession(c);
      const { requestId, reply } = c.req.valid('json');
      const ok = await harness.replyToPermission(
        requestId,
        session.workspace,
        reply,
      );
      return c.json({ ok });
    },
  )

  // POST /api/sessions/:id/reply-to-question?harnessId=
  .post(
    '/:id/reply-to-question',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', replyToQuestionSchema),
    async (c) => {
      const { harness, session } = await resolveSession(c);
      const { requestId, answers } = c.req.valid('json');
      const ok = await harness.replyToQuestion(
        requestId,
        answers,
        session.workspace,
      );
      return c.json({ ok });
    },
  )

  // POST /api/sessions/:id/reject-question?harnessId=
  .post(
    '/:id/reject-question',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', rejectQuestionSchema),
    async (c) => {
      const { harness, session } = await resolveSession(c);
      const { requestId } = c.req.valid('json');
      return c.json({
        ok: await harness.rejectQuestion(requestId, session.workspace),
      });
    },
  )

  // ------------------------------ Messages -------------------------------

  // GET /api/sessions/:id/messages?harnessId=
  .get(
    '/:id/messages',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json(groupMessages(await harness.listMessages(id)));
    },
  )

  // GET /api/sessions/:id/messages/:messageId?harnessId=
  .get(
    '/:id/messages/:messageId',
    zValidator('param', messageIdParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id, messageId } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json(await harness.getSessionMessage(id, messageId));
    },
  )

  // GET /api/sessions/:id/context?harnessId=
  .get(
    '/:id/context',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json(await harness.getSessionContext(id));
    },
  )

  // GET /api/sessions/:id/diff?harnessId=&messageId=&directory=
  .get(
    '/:id/diff',
    zValidator('param', idParamSchema),
    zValidator('query', diffQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { messageId, directory } = c.req.valid('query');
      const harness = await resolveHarness(c);
      return c.json(
        await harness.getSessionDiff({
          sessionID: id,
          messageID: messageId,
          directory,
        }),
      );
    },
  )

  // GET /api/sessions/:id/children?harnessId=
  .get(
    '/:id/children',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json((await harness.listSessionChildren(id)).reverse());
    },
  )

  // GET /api/sessions/:id/todos?harnessId=
  .get(
    '/:id/todos',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json(await harness.listTodos(id));
    },
  )

  // GET /api/sessions/:id/toc?harnessId=
  .get(
    '/:id/toc',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      const session = await harness.getSession(id);
      const items = await harness.listTocs(id);

      const tocs: AeroTocItem[] = [];
      for (const item of items) {
        if (session.revert?.messageID === item.id) break;
        tocs.push(item);
      }

      return c.json(tocs.length < 3 ? [] : tocs);
    },
  )

  // ------------------------- Share / markdown ----------------------------

  // GET /api/sessions/:id/share?harnessId=
  .get(
    '/:id/share',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json(await harness.shareSession(id));
    },
  )

  // GET /api/sessions/:id/unshare?harnessId=
  .get(
    '/:id/unshare',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json(await harness.unshareSession(id));
    },
  )

  // GET /api/sessions/:id/markdown?harnessId=
  .get(
    '/:id/markdown',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json(await harness.messagesToMarkdown(id));
    },
  )

  // ------------------------------- Pinned --------------------------------

  // GET /api/sessions/:id/pinned?harnessId=
  .get(
    '/:id/pinned',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { session } = await resolveSession(c);

      const metadata = (session.metadata ?? {}) as SessionMetadata;
      const aero = metadata.aero ?? {};
      const messages = Array.isArray(aero.context_obligatory_messages)
        ? aero.context_obligatory_messages
        : [];

      return c.json(messages);
    },
  )

  // POST /api/sessions/:id/pinned?harnessId=
  .post(
    '/:id/pinned',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', togglePinnedSchema),
    async (c) => {
      const { id, harness, session } = await resolveSession(c);
      const { messageId, pinned } = c.req.valid('json');

      // Look up the message to get authoritative role + timestamp.
      const message = await harness.getSessionMessage(id, messageId);
      const createdAt =
        (message as { createdAt?: number }).createdAt ?? Date.now();

      const metadata = (session.metadata ?? {}) as SessionMetadata;
      const aero = metadata.aero ?? {};
      const existing = Array.isArray(aero.context_obligatory_messages)
        ? aero.context_obligatory_messages
        : [];

      const next = pinned
        ? [
            ...existing.filter((m) => m.id !== messageId),
            { id: messageId, createdAt, role: message.role },
          ].sort((a, b) => a.createdAt - b.createdAt)
        : existing.filter((m) => m.id !== messageId);

      await harness.updateSessionMetadata({
        sessionID: id,
        metadata: produce(metadata, (draft) => {
          draft.aero ??= {};
          draft.aero.context_obligatory_messages = next;
        }),
      });

      return c.json(next);
    },
  )

  // --------------------------- Session actions ---------------------------

  // PATCH /api/sessions/:id/rename?harnessId=
  .patch(
    '/:id/rename',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', renameSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { title } = c.req.valid('json');
      const harness = await resolveHarness(c);
      return c.json(await harness.renameSession({ sessionId: id, title }));
    },
  )

  // GET /api/sessions/:id/metadata/:key?harnessId=
  .get(
    '/:id/metadata/:key',
    zValidator('param', metadataKeyParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { key } = c.req.valid('param');
      const { session } = await resolveSession(c);

      const metadata = (session.metadata ?? {}) as Record<string, unknown>;
      const value = key
        .split('.')
        .reduce<unknown>(
          (acc, part) =>
            acc && typeof acc === 'object'
              ? (acc as Record<string, unknown>)[part]
              : undefined,
          metadata,
        );

      if (value === undefined) {
        return c.json({ error: 'Metadata key not found', key }, 404);
      }

      return c.json({ key, value });
    },
  )

  // PATCH /api/sessions/:id/metadata?harnessId=
  .patch(
    '/:id/metadata',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', patchSessionMetadataSchema),
    async (c) => {
      const { id, harness, session } = await resolveSession(c);
      const { metadata } = c.req.valid('json');

      const current = (session.metadata ?? {}) as SessionMetadata;
      const merged = produce(current, (draft) => {
        Object.assign(draft, metadata);
      });

      return c.json(
        await harness.updateSessionMetadata({
          sessionID: id,
          metadata: merged,
        }),
      );
    },
  )

  // PATCH /api/sessions/:id/model?harnessId=
  .patch(
    '/:id/model',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', updateModelSchema),
    async (c) => {
      const { model, directory } = c.req.valid('json');
      const harness = await resolveHarness(c);
      return c.json(await harness.updateActiveModel(model, directory));
    },
  )

  // PATCH /api/sessions/archive/bulk?harnessId=&ids=
  .patch(
    '/archive/bulk',
    zValidator('query', harnessBulkQuerySchema),
    async (c) => {
      const harness = await resolveHarness(c);
      const { ids } = c.req.valid('query');
      return c.json(await harness.archiveBulkSessions(ids));
    },
  )

  // PATCH /api/sessions/:id/archive?harnessId=
  .patch(
    '/:id/archive',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json(await harness.archiveSession(id));
    },
  )

  // PATCH /api/sessions/unarchive/bulk?harnessId=&ids=
  .patch(
    '/unarchive/bulk',
    zValidator('query', harnessBulkQuerySchema),
    async (c) => {
      const harness = await resolveHarness(c);
      const { ids } = c.req.valid('query');
      return c.json(await harness.unarchiveBulkSessions(ids));
    },
  )

  // PATCH /api/sessions/:id/unarchive?harnessId=
  .patch(
    '/:id/unarchive',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json(await harness.unarchiveSession(id));
    },
  )

  // DELETE /api/sessions/delete/bulk?harnessId=&ids=
  .delete(
    '/delete/bulk',
    zValidator('query', harnessBulkQuerySchema),
    async (c) => {
      const harness = await resolveHarness(c);
      const { ids } = c.req.valid('query');
      return c.json(await harness.deleteBulkSessions(ids));
    },
  )

  // DELETE /api/sessions/:id?harnessId=
  .delete(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json({ ok: await harness.deleteSession(id) });
    },
  )

  // POST /api/sessions/:id/restore?harnessId=
  .post(
    '/:id/restore',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json(await harness.unrevertSession(id));
    },
  )

  // POST /api/sessions/:id/revert?harnessId=
  .post(
    '/:id/revert',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', messageIdBodySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { messageId } = c.req.valid('json');
      const harness = await resolveHarness(c);
      return c.json(await harness.revertSession(id, messageId));
    },
  )

  // POST /api/sessions/:id/fork?harnessId=
  .post(
    '/:id/fork',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', messageIdBodySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { messageId } = c.req.valid('json');
      const harness = await resolveHarness(c);
      return c.json(await harness.forkSession(id, messageId));
    },
  )

  // POST /api/sessions/:id/compact?harnessId=
  .post(
    '/:id/compact',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', compactSchema),
    async (c) => {
      const { id, harness, session } = await resolveSession(c);
      return c.json(
        harness.compactSession(id, c.req.valid('json'), session.workspace),
      );
    },
  )

  // POST /api/sessions/:id/command?harnessId=
  .post(
    '/:id/command',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', commandSchema),
    async (c) => {
      const { id, harness, session } = await resolveSession(c);
      return c.json(
        harness.sendCommand(id, c.req.valid('json'), session.workspace),
      );
    },
  )

  // POST /api/sessions/:id/shell?harnessId=
  .post(
    '/:id/shell',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', shellSchema),
    async (c) => {
      const { id, harness, session } = await resolveSession(c);
      return c.json(
        harness.sendShellCommand(id, c.req.valid('json'), session.workspace),
      );
    },
  )

  // POST /api/sessions/:id/message?harnessId=
  .post(
    '/:id/message',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    zValidator('json', messageSchema),
    async (c) => {
      const { id, harness, session } = await resolveSession(c);
      const body = c.req.valid('json');
      const parts = await expandMessageParts(
        body.parts,
        session.workspace,
        harness,
      );
      return c.json(
        harness.sendMessage(id, { ...body, parts }, session.workspace),
      );
    },
  )

  // POST /api/sessions/:id/abort?harnessId=
  .post(
    '/:id/abort',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json({ ok: await harness.abortSession(id) });
    },
  )

  // POST /api/sessions/:id/any?harnessId=
  .get(
    '/:id/any',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const harness = await resolveHarness(c);
      return c.json(await harness.any(id));
    },
  )

  // ------------------------------- Stream --------------------------------

  // GET /api/sessions/:id/stream?harnessId=  (SSE)
  .get(
    '/:id/stream',
    zValidator('param', idParamSchema),
    zValidator('query', harnessQuerySchema),
    (c) => streamSessionEvents(c),
  );

export default sessions;
export type SessionsRoutes = typeof sessions;
