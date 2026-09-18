import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  createSnippet,
  deleteSnippet,
  getSnippet,
  listSnippets,
  updateSnippet,
} from '@/server/services/snippets';

const nameParamSchema = z.object({
  name: z.string().min(1),
});

const bodySchema = z.object({
  content: z.string(),
});

const snippets = new Hono()
  .get('/', async (c) => {
    const snippets = await listSnippets();
    return c.json(snippets);
  })
  .get('/:name', zValidator('param', nameParamSchema), async (c) => {
    const { name } = c.req.valid('param');
    const snippet = await getSnippet(name);
    if (!snippet) return c.json({ error: 'Snippet not found' }, 404);
    return c.json(snippet);
  })
  .post(
    '/:name',
    zValidator('param', nameParamSchema),
    zValidator('json', bodySchema),
    async (c) => {
      const { name } = c.req.valid('param');
      const { content } = c.req.valid('json');

      try {
        const snippet = await createSnippet(name, content);
        return c.json(snippet, 201);
      } catch (err) {
        return c.json({ error: (err as Error).message }, 400);
      }
    },
  )
  .put(
    '/:name',
    zValidator('param', nameParamSchema),
    zValidator('json', bodySchema),
    async (c) => {
      const { name } = c.req.valid('param');
      const { content } = c.req.valid('json');
      const snippet = await updateSnippet(name, content);
      return c.json(snippet);
    },
  )
  .delete('/:name', zValidator('param', nameParamSchema), async (c) => {
    const { name } = c.req.valid('param');
    await deleteSnippet(name);
    return c.body(null, 204);
  });

export default snippets;
