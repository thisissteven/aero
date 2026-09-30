import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  createSnippet,
  deleteSnippet,
  listSnippets,
  updateSnippet,
} from '@/server/services/snippets';

const idParamSchema = z.object({
  id: z.string().min(1),
});

const listQuerySchema = z.object({
  directory: z.string().optional(),
});

const createSchema = z.object({
  name: z.string().min(1),
  content: z.string(),
  description: z.string().optional(),
  aliases: z.array(z.string()).optional(),
  scope: z.enum(['global', 'workspace']),
  directory: z.string().optional(),
});

const updateSchema = createSchema.partial();

const snippets = new Hono()
  // GET /api/snippets?directory=... -> global + workspace snippets for a directory
  .get('/', zValidator('query', listQuerySchema), async (c) => {
    const { directory } = c.req.valid('query');
    const result = await listSnippets(directory);
    return c.json(result);
  })

  // POST /api/snippets
  .post('/', zValidator('json', createSchema), async (c) => {
    try {
      const snippet = await createSnippet(c.req.valid('json'));
      return c.json(snippet, 201);
    } catch (err) {
      return c.json({ error: (err as Error).message }, 400);
    }
  })

  // PATCH /api/snippets/:id
  .patch(
    '/:id',
    zValidator('param', idParamSchema),
    zValidator('json', updateSchema),
    async (c) => {
      try {
        const { id } = c.req.valid('param');
        const snippet = await updateSnippet(id, c.req.valid('json'));
        return c.json(snippet);
      } catch (err) {
        return c.json({ error: (err as Error).message }, 400);
      }
    },
  )

  // DELETE /api/snippets/:id
  .delete('/:id', zValidator('param', idParamSchema), async (c) => {
    const { id } = c.req.valid('param');
    await deleteSnippet(id);
    return c.body(null, 204);
  });

export default snippets;
