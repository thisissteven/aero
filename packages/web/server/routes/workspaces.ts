// server/routes/workspaces.ts

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { withPagination } from '../helper';
import { getActiveAdapter, getAllAdapters } from '../services/harness/registry';
import {
  mergeAllWorkspacesAcrossAdapters,
  mergeWorkspaceAcrossAdapters,
} from '../services/workspace/workspaces-merger';

const idParamSchema = z.object({
  id: z.string().min(1),
});

const createWorkspaceSchema = z.object({
  name: z.string().optional(),
  directory: z.string().min(1),
  worktrees: z
    .array(
      z.object({
        name: z.string().optional(),
        directory: z.string().min(1),
      }),
    )
    .optional(),
});

const updateWorkspaceSchema = z.object({
  name: z.string().optional(),
  directory: z.string().optional(),
});

const addWorktreeSchema = z.object({
  name: z.string().optional(),
  directory: z.string().min(1),
});

const workspaces = new Hono()
  // GET /api/workspaces/merged -> Returns unified workspaces with sessions merged from ALL adapters
  .get(
    '/merged',
    zValidator('query', withPagination(z.object({}))),
    async (c) => {
      const { cursor, limit, search } = c.req.valid('query');
      const adapters = await getAllAdapters();

      const result = await mergeAllWorkspacesAcrossAdapters(adapters, {
        cursor,
        limit,
        search,
      });

      return c.json(result);
    },
  )

  // GET /api/workspaces?workspaceId=...&cursor=...&limit=...&search=...
  .get(
    '/',
    zValidator(
      'query',
      withPagination(
        z.object({
          harnessId: z.string().optional(),
        }),
      ),
    ),
    async (c) => {
      const { harnessId, cursor, limit, search } = c.req.valid('query');
      const harness = await getActiveAdapter(harnessId);

      const result = await harness.listWorkspaces({
        cursor,
        limit,
        search,
      });

      return c.json(result);
    },
  )

  // POST /api/workspaces
  .post('/', zValidator('json', createWorkspaceSchema), async (c) => {
    const body = c.req.valid('json');
    const harness = await getActiveAdapter();
    const workspace = await harness.createWorkspace(body);

    const adapters = await getAllAdapters();
    const merged = await mergeWorkspaceAcrossAdapters(adapters, workspace.id);

    return c.json(merged, 201);
  })

  // POST /api/workspaces/init
  .post('/init', async (c) => {
    const adapters = await getAllAdapters();

    // Initialize primary workspace store
    await adapters[0].initWorkspaces();

    const result = await mergeAllWorkspacesAcrossAdapters(adapters, {});
    return c.json(result.items);
  })

  // POST /api/workspaces/sync
  .post('/sync', async (c) => {
    const adapters = await getAllAdapters();

    // Sync all adapters in parallel
    await Promise.all(adapters.map((a) => a.syncWorkspaces()));

    const result = await mergeAllWorkspacesAcrossAdapters(adapters, {});
    return c.json(result.items);
  })

  // GET /api/workspaces/:id -> Merges sessions for a single workspace
  .get('/:id', zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param');
    const adapters = await getAllAdapters();

    const workspace = await mergeWorkspaceAcrossAdapters(adapters, id);
    return c.json(workspace);
  })

  // PATCH /api/workspaces/:id
  .patch(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', updateWorkspaceSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');

      const harness = await getActiveAdapter();
      await harness.updateWorkspace(id, body);

      const adapters = await getAllAdapters();
      const updated = await mergeWorkspaceAcrossAdapters(adapters, id);

      return c.json(updated);
    },
  )

  // DELETE /api/workspaces/:id
  .delete('/:id', zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param');
    const adapters = await getAllAdapters();

    // Trigger session archiving across ALL adapters for this workspace
    const results = await Promise.allSettled(
      adapters.map((a) => a.deleteWorkspace(id)),
    );

    const ok = results.some((r) => r.status === 'fulfilled' && r.value);
    return c.json({ ok });
  })

  // POST /api/workspaces/:id/worktrees
  .post(
    '/:id/worktrees',
    zValidator('param', idParamSchema),
    zValidator('json', addWorktreeSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const body = c.req.valid('json');

      const harness = await getActiveAdapter();
      await harness.addWorktree(id, body);

      const adapters = await getAllAdapters();
      const workspace = await mergeWorkspaceAcrossAdapters(adapters, id);

      return c.json(workspace);
    },
  )

  // DELETE /api/workspaces/:id/worktrees/:worktreeId
  .delete(
    '/:id/worktrees/:worktreeId',
    zValidator(
      'param',
      z.object({ id: z.string().min(1), worktreeId: z.string().min(1) }),
    ),
    async (c) => {
      const { id, worktreeId } = c.req.valid('param');
      const adapters = await getAllAdapters();

      await Promise.allSettled(
        adapters.map((a) => a.removeWorktree(id, worktreeId)),
      );

      const workspace = await mergeWorkspaceAcrossAdapters(adapters, id);
      return c.json(workspace);
    },
  );

export default workspaces;
export type WorkspacesRoutes = typeof workspaces;
