// server/routes/agents.ts

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import { getActiveAdapter } from '../services/harness/registry';

const commonQuerySchema = z.object({
  harnessId: z.string().optional(),
  directory: z.string().optional(),
});

const toolsQuerySchema = commonQuerySchema.extend({
  provider: z.string().min(1, 'Provider is required'),
  model: z.string().min(1, 'Model is required'),
});

const agents = new Hono()
  // GET /api/agents?harnessId=...&directory=...
  .get('/', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const agents = await harness.listAgents(directory);
    return c.json(agents);
  })

  // GET /api/agents/compact?harnessId=...&directory=...
  .get('/compact', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const agents = await harness.listAgentsCompact(directory);
    return c.json(agents);
  })

  // GET /api/agents/skills?harnessId=...&directory=...
  .get('/skills', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const skills = await harness.listSkills(directory);
    return c.json(skills);
  })

  // GET /api/agents/commands?harnessId=...&directory=...
  .get('/commands', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const commands = await harness.listCommands(directory);
    return c.json(commands);
  })

  // GET /api/agents/tools?provider=...&model=...&harnessId=...&directory=...
  .get('/tools', zValidator('query', toolsQuerySchema), async (c) => {
    const { harnessId, provider, model, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const tools = await harness.listTools(provider, model, directory);
    return c.json(tools);
  });

export default agents;
export type AgentsRoutes = typeof agents;
