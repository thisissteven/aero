// server/routes/worktree.ts

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { getActiveAdapter } from '../services/harness/registry';

const commonQuerySchema = z.object({
  harnessId: z.string().optional(),
  directory: z.string().optional(),
});

const createWorktreeSchema = z.object({
  directory: z.string().min(1, 'Directory is required'),
  name: z.string().min(1, 'Worktree name is required'),
});

const removeWorktreeSchema = z.object({
  directory: z.string().min(1, 'Directory is required'),
});

const worktree = new Hono()
  // GET /api/worktrees?harnessId=...&directory=...
  .get('/', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const names = await harness.listWorktreeNames(directory);
    return c.json(names);
  })

  // POST /api/worktrees?harnessId=... body: { directory, name }
  .post(
    '/',
    zValidator('query', commonQuerySchema.pick({ harnessId: true })),
    zValidator('json', createWorktreeSchema),
    async (c) => {
      const { harnessId } = c.req.valid('query');
      const { directory, name } = c.req.valid('json');

      const harness = await getActiveAdapter(harnessId);
      const item = await harness.createWorktree(directory, name);
      return c.json(item);
    },
  )

  // DELETE /api/worktrees?harnessId=... body: { directory }
  .delete(
    '/',
    zValidator('query', commonQuerySchema.pick({ harnessId: true })),
    zValidator('json', removeWorktreeSchema),
    async (c) => {
      const { harnessId } = c.req.valid('query');
      const { directory } = c.req.valid('json');

      const harness = await getActiveAdapter(harnessId);
      const ok = await harness.removeWorktreeItem(directory);
      return c.json({ ok });
    },
  );

export default worktree;
export type WorktreeRoutes = typeof worktree;
