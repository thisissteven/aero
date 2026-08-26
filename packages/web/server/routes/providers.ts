// server/routes/providers.ts

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { getActiveAdapter } from '../services/harness/registry';

const commonQuerySchema = z.object({
  harnessId: z.string().optional(),
  directory: z.string().optional(),
});

const setApiKeySchema = z.object({
  provider: z.string().min(1, 'Provider is required'),
  apiKey: z.string().min(1, 'API Key is required'),
});

const providers = new Hono()
  // GET /api/providers?harnessId=...&directory=...
  .get('/', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const result = await harness.listProviders(directory);
    return c.json(result);
  })

  // GET /api/providers/configured?harnessId=...&directory=...
  .get('/configured', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const result = await harness.listConfiguredProviders(directory);
    return c.json(result);
  })

  // POST /api/providers/auth?harnessId=... body: { provider, apiKey }
  .post(
    '/auth',
    zValidator('query', commonQuerySchema.pick({ harnessId: true })),
    zValidator('json', setApiKeySchema),
    async (c) => {
      const { harnessId } = c.req.valid('query');
      const { provider, apiKey } = c.req.valid('json');

      const harness = await getActiveAdapter(harnessId);
      const ok = await harness.setApiKey(provider, apiKey);
      return c.json({ ok });
    },
  );

export default providers;
export type ProvidersRoutes = typeof providers;
