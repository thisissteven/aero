import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { getActivitySummary } from '@/server/services/activity';

const querySchema = z.object({
  directory: z.string().optional(),
});

const activity = new Hono().get(
  '/',
  zValidator('query', querySchema),
  async (c) => {
    const { directory } = c.req.valid('query');
    const summary = await getActivitySummary({ directory });
    return c.json(summary);
  },
);

export default activity;
