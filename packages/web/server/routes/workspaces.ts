// server/routes/workspaces.ts

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  createWorkspace,
  deleteWorkspace,
  getWorkspace,
  listWorkspaces,
} from '@/storage/workspaces';

const createWorkspaceSchema = z.object({
  name: z.string(),
  directory: z.string(),
  harness: z.string().optional(),
});

const workspaces = new Hono()
  .get('/', async (c) => c.json(await listWorkspaces()))

  .post('/', zValidator('json', createWorkspaceSchema), async (c) => {
    const body = c.req.valid('json');
    return c.json(await createWorkspace(body));
  })

  .get('/:id', async (c) => {
    const workspace = await getWorkspace(c.req.param('id'));
    if (!workspace) return c.json({ error: 'Workspace not found' }, 404);
    return c.json(workspace);
  })

  .delete('/:id', async (c) => {
    const ok = await deleteWorkspace(c.req.param('id'));
    if (!ok) return c.json({ error: 'Workspace not found' }, 404);
    return c.json({ ok });
  });

export default workspaces;
export type WorkspacesRoutes = typeof workspaces;
