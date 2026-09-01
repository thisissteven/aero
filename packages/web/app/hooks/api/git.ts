// app/hooks/git.ts

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType } from 'hono/client';

import { honoClient } from '@/app/lib';

const $git = honoClient.api.git;

export const gitKeys = {
  all: (directory?: string) => ['git', directory ?? 'default'] as const,
  status: (directory?: string) =>
    [...gitKeys.all(directory), 'status'] as const,
  currentBranch: (directory?: string) =>
    [...gitKeys.all(directory), 'currentBranch'] as const,
  diff: (directory?: string, filePath?: string) =>
    [...gitKeys.all(directory), 'diff', filePath ?? 'all'] as const,
  branches: (directory?: string) =>
    [...gitKeys.all(directory), 'branches'] as const,
  worktrees: (directory?: string) =>
    [...gitKeys.all(directory), 'worktrees'] as const,
  errorCode: (directory?: string) =>
    [...gitKeys.all(directory), 'error-code'] as const,
};

type CommitInput = InferRequestType<typeof $git.commit.$post>['json'];
type CheckoutInput = InferRequestType<typeof $git.checkout.$post>['json'];

export function useGitStatus(directory?: string) {
  return useQuery({
    queryKey: gitKeys.status(directory),
    queryFn: async () => {
      if (!directory) return null;
      const res = await $git.status.$get({
        query: { directory },
      });
      if (!res.ok) throw new Error('Failed to fetch Git status');
      return res.json();
    },
    enabled: !!directory,
  });
}

export function useGitCurrentBranch(directory?: string) {
  return useQuery({
    queryKey: gitKeys.currentBranch(directory),
    queryFn: async () => {
      if (!directory) return null;
      const res = await $git.current.$get({
        query: { directory },
      });
      if (!res.ok) throw new Error('Failed to fetch Git current branch');
      return res.json();
    },
    enabled: !!directory,
  });
}

export function useGitDiff(directory?: string, filePath?: string) {
  return useQuery({
    queryKey: gitKeys.diff(directory, filePath),
    queryFn: async () => {
      if (!directory) return null;
      const res = await $git.diff.$get({
        query: {
          directory,
          filePath: filePath || undefined,
        },
      });
      if (!res.ok) throw new Error('Failed to fetch Git diff');
      return res.json();
    },
    enabled: !!directory,
  });
}

export function useGitErrorCode(directory?: string) {
  return useQuery({
    queryKey: gitKeys.errorCode(directory),
    queryFn: async () => {
      if (!directory) return null;
      const res = await $git['error-code'].$get({
        query: { directory },
      });
      return res.json();
    },
    enabled: !!directory,
  });
}

export function useGitBranches(directory?: string) {
  return useQuery({
    queryKey: gitKeys.branches(directory),
    queryFn: async () => {
      if (!directory) return null;
      const res = await $git.branches.$get({
        query: { directory },
      });
      if (!res.ok) throw new Error('Failed to fetch Git branches');
      return res.json();
    },
    enabled: !!directory,
  });
}

export function useGitWorktrees(directory?: string) {
  return useQuery({
    queryKey: gitKeys.worktrees(directory),
    queryFn: async () => {
      if (!directory) return null;
      const res = await $git.worktrees.$get({
        query: { directory },
      });
      if (!res.ok) throw new Error('Failed to fetch Git worktrees');
      return res.json();
    },
    enabled: !!directory,
  });
}

export function useGitCommit() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: CommitInput) => {
      const res = await $git.commit.$post({ json });
      if (!res.ok) throw new Error('Failed to create commit');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: gitKeys.all(variables.directory),
      });
    },
  });
}

export function useGitCheckout() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (json: CheckoutInput) => {
      const res = await $git.checkout.$post({ json });
      if (!res.ok) throw new Error('Failed to checkout target');
      return res.json();
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: gitKeys.all(variables.directory),
      });
    },
  });
}
