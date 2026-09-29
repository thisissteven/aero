// server/routes/project-context.ts
//
// Notes, todos, and plan documents for a workspace. Storage is owned by
// `services/project-context`; these routes only validate input, delegate, and
// map the result to a status code.

import { zValidator } from '@hono/zod-validator';
import { type Context, Hono } from 'hono';
import { z } from 'zod';

import {
  createPlan,
  deletePlan,
  readContext,
  readPlan,
  saveNotes,
  saveTodos,
} from '@/server/services/project-context';

const workspaceIdParamSchema = z.object({
  workspaceId: z.string().min(1),
});

const planIdParamSchema = z.object({
  workspaceId: z.string().min(1),
  planId: z.string().min(1),
});

const notesBodySchema = z.object({
  notes: z.string(),
});

const todosBodySchema = z.object({
  todos: z.array(
    z.object({
      id: z.string().min(1),
      text: z.string(),
      completed: z.boolean().optional(),
      createdAt: z.number().finite().optional(),
    }),
  ),
});

const createPlanBodySchema = z.object({
  title: z.string().optional(),
  body: z.string(),
});

function isValidationError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : '';
  return (
    message.includes('Invalid workspace id') ||
    message.includes('must be') ||
    message.includes('is required') ||
    message.includes('too large') ||
    message.includes('at most')
  );
}

function respondWithError(c: Context, error: unknown, fallback: string) {
  const message = error instanceof Error ? error.message : fallback;
  return c.json(
    { error: message || fallback },
    isValidationError(error) ? 400 : 500,
  );
}

const projectContext = new Hono()
  .get(
    '/:workspaceId',
    zValidator('param', workspaceIdParamSchema),
    async (c) => {
      const { workspaceId } = c.req.valid('param');

      try {
        return c.json(await readContext(workspaceId));
      } catch (error) {
        return respondWithError(c, error, 'Failed to read project context');
      }
    },
  )

  .put(
    '/:workspaceId/notes',
    zValidator('param', workspaceIdParamSchema),
    zValidator('json', notesBodySchema),
    async (c) => {
      const { workspaceId } = c.req.valid('param');
      const { notes } = c.req.valid('json');

      try {
        return c.json(await saveNotes(workspaceId, notes));
      } catch (error) {
        return respondWithError(c, error, 'Failed to save notes');
      }
    },
  )

  .put(
    '/:workspaceId/todos',
    zValidator('param', workspaceIdParamSchema),
    zValidator('json', todosBodySchema),
    async (c) => {
      const { workspaceId } = c.req.valid('param');
      const { todos } = c.req.valid('json');

      try {
        return c.json(await saveTodos(workspaceId, todos));
      } catch (error) {
        return respondWithError(c, error, 'Failed to save todos');
      }
    },
  )

  .post(
    '/:workspaceId/plans',
    zValidator('param', workspaceIdParamSchema),
    zValidator('json', createPlanBodySchema),
    async (c) => {
      const { workspaceId } = c.req.valid('param');
      const { title, body } = c.req.valid('json');

      try {
        const result = await createPlan(workspaceId, { title, body });
        return c.json(result, 201);
      } catch (error) {
        return respondWithError(c, error, 'Failed to create plan');
      }
    },
  )

  .get(
    '/:workspaceId/plans/:planId',
    zValidator('param', planIdParamSchema),
    async (c) => {
      const { workspaceId, planId } = c.req.valid('param');

      try {
        const plan = await readPlan(workspaceId, planId);
        if (!plan) return c.json({ error: 'Plan not found' }, 404);
        return c.json(plan);
      } catch (error) {
        return respondWithError(c, error, 'Failed to read plan');
      }
    },
  )

  .delete(
    '/:workspaceId/plans/:planId',
    zValidator('param', planIdParamSchema),
    async (c) => {
      const { workspaceId, planId } = c.req.valid('param');

      try {
        const { deleted, context } = await deletePlan(workspaceId, planId);
        if (!deleted) return c.json({ error: 'Plan not found' }, 404);
        return c.json(context);
      } catch (error) {
        return respondWithError(c, error, 'Failed to delete plan');
      }
    },
  );

export default projectContext;
export type ProjectContextRoutes = typeof projectContext;
