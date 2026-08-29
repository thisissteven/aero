// app/hooks/worktree.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType } from 'hono/client';

import { honoClient } from '@/app/lib';

const $worktrees = honoClient.api.worktrees;

export const worktreeKeys = {
  all: (harnessId?: string, directory?: string) =>
    ['worktrees', harnessId ?? 'default', directory ?? 'root'] as const,
};

type CreateWorktreeInput = InferRequestType<typeof $worktrees.$post>['json'];
type RemoveWorktreeInput = InferRequestType<typeof $worktrees.$delete>['json'];

interface UseWorktreesOptions {
  harnessId?: string;
  directory?: string;
}

export function useWorktrees({
  harnessId,
  directory,
}: UseWorktreesOptions = {}) {
  return useQuery({
    queryKey: worktreeKeys.all(harnessId, directory),
    queryFn: async () => {
      const res = await $worktrees.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch worktrees');
      return res.json();
    },
    enabled: !!directory,
  });
}

export function useCreateWorktree(harnessId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorktreeInput) => {
      const res = await $worktrees.$post({
        query: { harnessId },
        json: input,
      });
      if (!res.ok) throw new Error('Failed to create worktree');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['worktrees', harnessId ?? 'default'],
      });
    },
  });
}

export function useRemoveWorktree(harnessId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: RemoveWorktreeInput) => {
      const res = await $worktrees.$delete({
        query: { harnessId },
        json: input,
      });
      if (!res.ok) throw new Error('Failed to remove worktree');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['worktrees', harnessId ?? 'default'],
      });
    },
  });
}
