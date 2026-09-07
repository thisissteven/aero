import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  type AeroSettingPath,
  type AeroSettingUpdate,
  getSetting,
  updateSetting,
} from '@/server/services/settings';

import { getActiveAdapter } from '../services/harness/registry';

const commonQuerySchema = z.object({
  harnessId: z.string().optional(),
  directory: z.string().optional(),
});

const getSettingQuerySchema = z.object({
  path: z.string().transform((value) => {
    return value
      .split('.')
      .map((part) => part.trim())
      .filter(Boolean) as AeroSettingPath;
  }),
});

const updateSettingSchema = z
  .object({
    path: z.array(z.string().min(1)).min(1),
    value: z.unknown(),
  })
  .transform((value): AeroSettingUpdate => value as AeroSettingUpdate);

const config = new Hono()
  // GET /api/config?harnessId=...&directory=...
  .get('/', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const result = await harness.getConfig(directory);

    return c.json(result);
  })

  // GET /api/config/settings?path=goalMode.sessionId
  .get('/settings', zValidator('query', getSettingQuerySchema), async (c) => {
    const { path } = c.req.valid('query');

    const value = await getSetting(path);

    return c.json({
      path,
      value,
    });
  })

  // PATCH /api/config/settings
  .patch('/settings', zValidator('json', updateSettingSchema), async (c) => {
    const { path, value } = c.req.valid('json');

    const updated = await updateSetting(path, value);

    return c.json({
      path,
      value: updated,
    });
  });

export default config;
export type ConfigRoutes = typeof config;
