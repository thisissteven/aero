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
  AeroProjectQueueMessage,
  AeroProjectTodo,
} from '@/server/services/harness/types';

const $projectContext = honoClient.api['project-context'];
const $workspaceContext = $projectContext[':workspaceId'];
const $note = $workspaceContext.notes[':noteId'];
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

export function useCreateProjectNote(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: { title?: string; body?: string }) => {
      const res = await $workspaceContext.notes.$post({
        param: { workspaceId: workspaceId! },
        json: input,
      });
      if (!res.ok) throw new Error('Failed to create note');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectContextKeys.all(workspaceId) });
    },
  });
}

/**
 * Autosaving a single note. The network call is debounced per workspace so a
 * burst of keystrokes collapses into one request, while the query cache updates
 * on every change to keep the UI instant.
 */
export function useSaveProjectNote(workspaceId?: string, noteId?: string) {
  return useOptimisticMutation<
    AeroProjectContext,
    { title?: string; body?: string }
  >({
    queryKey: () => projectContextKeys.all(workspaceId),
    mutationFn: async (input) => {
      const res = await $note.$put({
        param: { workspaceId: workspaceId!, noteId: noteId! },
        json: input,
      });
      if (!res.ok) throw new Error('Failed to save note');
      return res.json();
    },
    optimisticUpdate: (current, input) =>
      current
        ? {
            ...current,
            notes: current.notes.map((note) =>
              note.id === noteId
                ? { ...note, ...input, updatedAt: Date.now() }
                : note,
            ),
          }
        : current,
    debounceMs: 500,
  });
}

export function useDeleteProjectNote(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (noteId: string) => {
      const res = await $note.$delete({
        param: { workspaceId: workspaceId!, noteId },
      });
      if (!res.ok) throw new Error('Failed to delete note');
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: projectContextKeys.all(workspaceId) });
    },
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

export function useSaveProjectQueue(workspaceId?: string) {
  return useOptimisticMutation<AeroProjectContext, AeroProjectQueueMessage[]>({
    queryKey: () => projectContextKeys.all(workspaceId),
    mutationFn: async (queue) => {
      const res = await $workspaceContext.queue.$put({
        param: { workspaceId: workspaceId! },
        json: { queue },
      });
      if (!res.ok) throw new Error('Failed to save queue');
      return res.json();
    },
    optimisticUpdate: (current, queue) =>
      current ? { ...current, queue } : current,
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
