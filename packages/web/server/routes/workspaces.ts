// server/routes/workspaces.ts
//
// These routes NEVER import from server/adapters/*. They resolve whichever
// harness is active (per workspace) via getActiveAdapter() and call the
// HarnessAdapter interface. Swap opencode for codex/claude and every route
// below keeps working unchanged.

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { withPagination } from '../helper';
import { getActiveAdapter } from '../services/harness/registry';

const querySchema = z.object({
  workspaceId: z.string().min(1).optional(),
});

const idParamSchema = z.object({
  id: z.string().min(1),
});

const createWorkspaceSchema = z.object({
  name: z.string().optional(),
  directory: z.string().min(1),
  harness: z.string().optional(),
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
  harness: z.string().optional(),
});

const addWorktreeSchema = z.object({
  name: z.string().optional(),
  directory: z.string().min(1),
});

const workspaces = new Hono()
  // GET /api/workspaces?workspaceId=...&cursor=...&limit=...&search=...
  .get('/', zValidator('query', withPagination(querySchema)), async (c) => {
    const { workspaceId, cursor, limit, search } = c.req.valid('query');
    const harness = await getActiveAdapter(workspaceId);

    const result = await harness.listWorkspaces({
      cursor,
      limit,
      search,
    });

    return c.json(result);
  })

  // POST /api/workspaces?workspaceId=...
  .post(
    '/',
    zValidator('query', querySchema),
    zValidator('json', createWorkspaceSchema),
    async (c) => {
      const { workspaceId } = c.req.valid('query');
      const body = c.req.valid('json');

      const harness = await getActiveAdapter(workspaceId);
      const workspace = await harness.createWorkspace(body);

      return c.json(workspace, 201);
    },
  )

  // POST /api/workspaces/init?workspaceId=... (Initial sync on app first load)
  .post('/init', zValidator('query', querySchema), async (c) => {
    const { workspaceId } = c.req.valid('query');

    const harness = await getActiveAdapter(workspaceId);
    const workspaces = await harness.initWorkspaces();

    return c.json(workspaces);
  })

  // POST /api/workspaces/sync?workspaceId=... (Explicit re-sync/discovery)
  .post('/sync', zValidator('query', querySchema), async (c) => {
    const { workspaceId } = c.req.valid('query');

    const harness = await getActiveAdapter(workspaceId);
    const workspaces = await harness.syncWorkspaces();

    return c.json(workspaces);
  })

  // GET /api/workspaces/:id?workspaceId=...
  .get(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');

      const harness = await getActiveAdapter(workspaceId);
      const workspace = await harness.getWorkspace(id);

      return c.json(workspace);
    },
  )

  // PATCH /api/workspaces/:id?workspaceId=...
  .patch(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    zValidator('json', updateWorkspaceSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');
      const body = c.req.valid('json');

      const harness = await getActiveAdapter(workspaceId);
      const updated = await harness.updateWorkspace(id, body);

      return c.json(updated);
    },
  )

  // DELETE /api/workspaces/:id?workspaceId=...
  .delete(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');

      const harness = await getActiveAdapter(workspaceId);
      const ok = await harness.deleteWorkspace(id);

      return c.json({ ok });
    },
  )

  // POST /api/workspaces/:id/worktrees?workspaceId=...
  .post(
    '/:id/worktrees',
    zValidator('param', idParamSchema),
    zValidator('query', querySchema),
    zValidator('json', addWorktreeSchema),
    async (c) => {
      const { id } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');
      const body = c.req.valid('json');

      const harness = await getActiveAdapter(workspaceId);
      const workspace = await harness.addWorktree(id, body);

      return c.json(workspace);
    },
  )

  // DELETE /api/workspaces/:id/worktrees/:worktreeId?workspaceId=...
  .delete(
    '/:id/worktrees/:worktreeId',
    zValidator(
      'param',
      z.object({ id: z.string().min(1), worktreeId: z.string().min(1) }),
    ),
    zValidator('query', querySchema),
    async (c) => {
      const { id, worktreeId } = c.req.valid('param');
      const { workspaceId } = c.req.valid('query');

      const harness = await getActiveAdapter(workspaceId);
      const workspace = await harness.removeWorktree(id, worktreeId);

      return c.json(workspace);
    },
  );

export default workspaces;
export type WorkspacesRoutes = typeof workspaces;
