import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { getSetting, toggleSetting } from '@/server/services/settings';

import { getActiveAdapter } from '../services/harness/registry';

const commonQuerySchema = z.object({
  harnessId: z.string().optional(),
  directory: z.string().optional(),
});

const booleanSettingSchema = z.enum([
  'goalMode',
  'chatInputExpanded',
  'permissionAutoAcceptSessions',
]);

const settingParamsSchema = z.object({
  setting: booleanSettingSchema,
  id: z.string().min(1),
});

const config = new Hono()
  // GET /api/config?harnessId=...&directory=...
  .get('/', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const result = await harness.getConfig(directory);

    return c.json(result);
  })

  // GET /api/config/settings/:setting/:id
  .get(
    '/settings/:setting/:id',
    zValidator('param', settingParamsSchema),
    async (c) => {
      const { setting, id } = c.req.valid('param');

      const value = await getSetting(setting, id);

      return c.json({
        sessionId: id,
        value: value === true,
      });
    },
  )

  // POST /api/config/settings/:setting/:id/toggle
  .post(
    '/settings/:setting/:id/toggle',
    zValidator('param', settingParamsSchema),
    async (c) => {
      const { setting, id } = c.req.valid('param');

      const value = await toggleSetting(setting, id);

      return c.json({
        sessionId: id,
        value,
      });
    },
  );

export default config;
export type ConfigRoutes = typeof config;
