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

const capabilities = new Hono()
  // GET /api/capabilities?harnessId=...&directory=...
  .get('/', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const [agents, commands, skills] = await Promise.all([
      harness.listAgentsCompact(directory),
      harness.listCommandsCompact(directory),
      harness.listSkillsCompact(directory),
    ]);

    return c.json({ agents, commands, skills });
  })

  // GET /api/capabilities/agents?harnessId=...&directory=...
  .get('/agents', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const agents = await harness.listAgents(directory);
    return c.json(agents);
  })

  // GET /api/capabilities/agents/compact?harnessId=...&directory=...
  .get('/agents/compact', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const agents = await harness.listAgentsCompact(directory);
    return c.json(agents);
  })

  // GET /api/capabilities/skills?harnessId=...&directory=...
  .get('/skills', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const skills = await harness.listSkills(directory);
    return c.json(skills);
  })

  // GET /api/capabilities/skills/compact?harnessId=...&directory=...
  .get('/skills/compact', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const skills = await harness.listSkillsCompact(directory);
    return c.json(skills);
  })

  // GET /api/capabilities/commands?harnessId=...&directory=...
  .get('/commands', zValidator('query', commonQuerySchema), async (c) => {
    const { harnessId, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const commands = await harness.listCommands(directory);
    return c.json(commands);
  })

  // GET /api/capabilities/commands/compact?harnessId=...&directory=...
  .get(
    '/commands/compact',
    zValidator('query', commonQuerySchema),
    async (c) => {
      const { harnessId, directory } = c.req.valid('query');
      const harness = await getActiveAdapter(harnessId);

      const commands = await harness.listCommandsCompact(directory);
      return c.json(commands);
    },
  )

  // GET /api/capabilities/tools?provider=...&model=...&harnessId=...&directory=...
  .get('/tools', zValidator('query', toolsQuerySchema), async (c) => {
    const { harnessId, provider, model, directory } = c.req.valid('query');
    const harness = await getActiveAdapter(harnessId);

    const tools = await harness.listTools(provider, model, directory);
    return c.json(tools);
  });

export default capabilities;
export type CapabilitiesRoutes = typeof capabilities;
