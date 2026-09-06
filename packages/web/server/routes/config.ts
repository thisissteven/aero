// server/routes/config.ts

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { getActiveAdapter } from '../services/harness/registry';

const commonQuerySchema = z.object({
  harnessId: z.string().optional(),
  directory: z.string().optional(),
});

const config = new Hono()
  // GET /api/config?harnessId=...&directory=...
  .get('/', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const result = await harness.getConfig(directory);
    return c.json(result);
  })

  // GET /api/config?harnessId=...&directory=...
  .post(
    '/',
    zValidator('query', commonQuerySchema),
    zValidator(
      'json',
      z.object({
        allowAll: z.boolean(),
      }),
    ),
    async (c) => {
      const { harnessId, directory } = c.req.valid('query');
      const { allowAll } = c.req.valid('json');
      const harness = await getActiveAdapter(harnessId);

      const result = await harness.setAutoAcceptPermissions(
        allowAll,
        directory,
      );
      return c.json(result);
    },
  );
export default config;
export type ConfigRoutes = typeof config;
