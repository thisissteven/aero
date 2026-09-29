import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InferRequestType } from 'hono/client';

import { useOptimisticMutation } from '@/app/hooks/useOptimisticMutation';
import { honoClient } from '@/app/lib';
import type {
  AeroProjectContext,
  AeroProjectTodo,
} from '@/server/services/harness/types';

const $projectContext = honoClient.api['project-context'];
const $workspaceContext = $projectContext[':workspaceId'];
const $plan = $workspaceContext.plans[':planId'];

export const projectContextKeys = {
  all: (workspaceId?: string) =>
    ['project-context', workspaceId ?? 'none'] as const,
  plan: (workspaceId: string | undefined, planId: string | undefined) =>
    [
      'project-context',
      workspaceId ?? 'none',
      'plan',
      planId ?? 'none',
    ] as const,
};

type CreatePlanInput = InferRequestType<
  typeof $workspaceContext.plans.$post
>['json'];

export function useProjectContext(workspaceId?: string) {
  return useQuery({
    queryKey: projectContextKeys.all(workspaceId),
    queryFn: async () => {
      const res = await $workspaceContext.$get({
        param: { workspaceId: workspaceId! },
      });
      if (!res.ok) throw new Error('Failed to read project context');
      return res.json();
    },
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
  });
}

/**
 * Autosaving notes. The network call is debounced per workspace so a burst of
 * keystrokes collapses into one request, while the query cache updates on every
 * change to keep the UI instant.
 */
export function useSaveProjectNotes(workspaceId?: string) {
  return useOptimisticMutation<AeroProjectContext, string>({
    queryKey: () => projectContextKeys.all(workspaceId),
    mutationFn: async (notes) => {
      const res = await $workspaceContext.notes.$put({
        param: { workspaceId: workspaceId! },
        json: { notes },
      });
      if (!res.ok) throw new Error('Failed to save notes');
      return res.json();
    },
    optimisticUpdate: (current, notes) =>
      current ? { ...current, notes } : current,
    debounceMs: 500,
  });
}

export function useSaveProjectTodos(workspaceId?: string) {
  return useOptimisticMutation<AeroProjectContext, AeroProjectTodo[]>({
    queryKey: () => projectContextKeys.all(workspaceId),
    mutationFn: async (todos) => {
      const res = await $workspaceContext.todos.$put({
        param: { workspaceId: workspaceId! },
        json: { todos },
      });
      if (!res.ok) throw new Error('Failed to save todos');
      return res.json();
    },
    optimisticUpdate: (current, todos) =>
      current ? { ...current, todos } : current,
    debounceMs: 300,
  });
}

export function useCreateProjectPlan(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreatePlanInput) => {
      const res = await $workspaceContext.plans.$post({
        param: { workspaceId: workspaceId! },
        json: input,
      });
      if (!res.ok) throw new Error('Failed to create plan');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectContextKeys.all(workspaceId) });
    },
  });
}

export function useProjectPlan(workspaceId?: string, planId?: string) {
  return useQuery({
    queryKey: projectContextKeys.plan(workspaceId, planId),
    queryFn: async () => {
      const res = await $plan.$get({
        param: { workspaceId: workspaceId!, planId: planId! },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!workspaceId && !!planId,
  });
}

export function useDeleteProjectPlan(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (planId: string) => {
      const res = await $plan.$delete({
        param: { workspaceId: workspaceId!, planId },
      });
      if (!res.ok) throw new Error('Failed to delete plan');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectContextKeys.all(workspaceId) });
    },
  });
}
