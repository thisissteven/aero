// server/routes/goals.ts
//
// File-backed goal objectives, keyed by session id (one goal per session; a
// new goal overwrites the old file). The UI writes the objective file before
// stamping the goal metadata (which only carries an `objectiveFile: true`
// flag), reads it back for display, and deletes it when the goal is removed.

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import { z } from 'zod';

import {
  deleteObjective,
  readObjective,
  writeObjective,
} from '@/server/services/goal/objectives';

const sessionIdParamSchema = z.object({
  sessionId: z.string().min(1),
});

const objectiveBodySchema = z.object({
  content: z.string(),
});

const goals = new Hono()
  .put(
    '/objective/:sessionId',
    zValidator('param', sessionIdParamSchema),
    zValidator('json', objectiveBodySchema),
    async (c) => {
      const { sessionId } = c.req.valid('param');
      const { content } = c.req.valid('json');

      try {
        await writeObjective(sessionId, content);
        return c.json({ ok: true });
      } catch (error) {
        const statusCode =
          Number((error as { statusCode?: number })?.statusCode) || 500;
        if (statusCode >= 500) {
          console.error('Failed to write goal objective:', error);
        }
        return c.json(
          {
            error:
              (error as Error)?.message || 'Failed to write goal objective',
          },
          statusCode === 400 ? 400 : 500,
        );
      }
    },
  )
  .get(
    '/objective/:sessionId',
    zValidator('param', sessionIdParamSchema),
    async (c) => {
      const { sessionId } = c.req.valid('param');
      const content = await readObjective(sessionId);
      if (content === null) {
        return c.json({ error: 'objective not found' }, 404);
      }
      return c.json({ content });
    },
  )
  .delete(
    '/objective/:sessionId',
    zValidator('param', sessionIdParamSchema),
    async (c) => {
      const { sessionId } = c.req.valid('param');
      await deleteObjective(sessionId);
      return c.json({ ok: true });
    },
  );

export default goals;
export type GoalRoutes = typeof goals;
