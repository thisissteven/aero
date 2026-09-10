// server/routes/agents.ts

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { getActiveAdapter } from '../services/harness/registry';

const commonQuerySchema = z.object({
  harnessId: z.string().optional(),
  directory: z.string().optional(),
});

const mcp = new Hono()
  // GET /api/mcp?harnessId=...&directory=...
  .get('/', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const entries = await harness.listMCPs(directory);

    return c.json(entries);
  })

  // POST /api/mcp?harnessId=...&directory=...
  .post(
    '/',
    zValidator('query', commonQuerySchema),
    zValidator(
      'json',
      z.object({
        name: z.string(),
        config: z.discriminatedUnion('type', [
          z.object({
            type: z.literal('local'),
            command: z.array(z.string()),
            environment: z.record(z.string(), z.string()).optional(),
            enabled: z.boolean().optional(),
            timeout: z.number().optional(),
          }),
          z.object({
            type: z.literal('remote'),
            url: z.string().url(),
            enabled: z.boolean().optional(),
            headers: z.record(z.string(), z.string()).optional(),
            oauth: z
              .union([
                z.object({
                  clientId: z.string().optional(),
                  clientSecret: z.string().optional(),
                  scope: z.string().optional(),
                }),
                z.literal(false),
              ])
              .optional(),
            timeout: z.number().optional(),
          }),
        ]),
      }),
    ),
    async (c) => {
      const { harnessId, directory } = c.req.valid('query');
      const { name, config } = c.req.valid('json');

      const harness = await getActiveAdapter(harnessId);
      const entries = await harness.addMCP({ directory, name, config });

      return c.json(entries);
    },
  )

  // POST /api/mcp/connect?harnessId=...&directory=...&name=...
  .post(
    '/connect',
    zValidator(
      'query',
      commonQuerySchema.extend({
        name: z.string(),
      }),
    ),
    async (c) => {
      const { harnessId, directory, name } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const entries = await harness.connectMCP({ directory, name });

      return c.json(entries);
    },
  )

  // POST /api/mcp/disconnect?harnessId=...&directory=...&name=...
  .post(
    '/disconnect',
    zValidator(
      'query',
      commonQuerySchema.extend({
        name: z.string(),
      }),
    ),
    async (c) => {
      const { harnessId, directory, name } = c.req.valid('query');

      const harness = await getActiveAdapter(harnessId);
      const entries = await harness.disconnectMCP({ directory, name });

      return c.json(entries);
    },
  );

export default mcp;
export type MCPRoutes = typeof mcp;
