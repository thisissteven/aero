// app/hooks/worktree.ts

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InferRequestType } from 'hono/client';

import { honoClient } from '@/app/lib';

const $worktree = honoClient.api.worktree;

export const worktreeKeys = {
  all: (harnessId?: string, directory?: string) =>
    ['worktrees', harnessId ?? 'default', directory ?? 'root'] as const,
};

type CreateWorktreeInput = InferRequestType<typeof $worktree.$post>['json'];
type RemoveWorktreeInput = InferRequestType<typeof $worktree.$delete>['json'];

interface UseWorktreeNamesOptions {
  harnessId?: string;
  directory?: string;
}

export function useWorktreeNames({
  harnessId,
  directory,
}: UseWorktreeNamesOptions = {}) {
  return useQuery({
    queryKey: worktreeKeys.all(harnessId, directory),
    queryFn: async () => {
      const res = await $worktree.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch worktrees');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

export function useCreateWorktree(harnessId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorktreeInput) => {
      const res = await $worktree.$post({
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
      const res = await $worktree.$delete({
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
