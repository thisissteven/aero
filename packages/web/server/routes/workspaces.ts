// server/routes/workspaces.ts
//
// Workspace operations no longer determine harness selection per workspace.
// Calling getActiveAdapter() resolves to the global default adapter.

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { withPagination } from '../helper';
import { getActiveAdapter } from '../services/harness/registry';

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
  // GET /api/workspaces?cursor=...&limit=...&search=...
  .get('/', zValidator('query', withPagination(z.object({}))), async (c) => {
    const { cursor, limit, search } = c.req.valid('query');
    const harness = await getActiveAdapter();

    const result = await harness.listWorkspaces({
      cursor,
      limit,
      search,
    });

    return c.json(result);
  })

  // POST /api/workspaces
  .post('/', zValidator('json', createWorkspaceSchema), async (c) => {
    const body = c.req.valid('json');

    const harness = await getActiveAdapter();
    const workspace = await harness.createWorkspace(body);

    return c.json(workspace, 201);
  })

  // POST /api/workspaces/init (Initial sync on app first load)
  .post('/init', async (c) => {
    const harness = await getActiveAdapter();
    const workspaces = await harness.initWorkspaces();

    return c.json(workspaces);
  })

  // POST /api/workspaces/sync (Explicit re-sync/discovery)
  .post('/sync', async (c) => {
    const harness = await getActiveAdapter();
    const workspaces = await harness.syncWorkspaces();

    return c.json(workspaces);
  })

  // GET /api/workspaces/:id
  .get('/:id', zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param');

    const harness = await getActiveAdapter();
    const workspace = await harness.getWorkspace(id);

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
      const updated = await harness.updateWorkspace(id, body);

      return c.json(updated);
    },
  )

  // DELETE /api/workspaces/:id
  .delete('/:id', zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param');

    const harness = await getActiveAdapter();
    const ok = await harness.deleteWorkspace(id);

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
      const workspace = await harness.addWorktree(id, body);

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

      const harness = await getActiveAdapter();
      const workspace = await harness.removeWorktree(id, worktreeId);

      return c.json(workspace);
    },
  );

export default workspaces;
export type WorkspacesRoutes = typeof workspaces;
