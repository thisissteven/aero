import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';

import { honoClient, PAGINATION_LIMIT } from '@/app/lib';

const $workspaces = honoClient.api.workspaces;
const $individualWorkspace = honoClient.api.workspaces[':id'];

export const workspaceKeys = {
  merged: () => ['workspaces', 'default'] as const,
  compact: () => ['workspaces', 'compact'] as const,
  detail: (workspaceId: string) =>
    ['workspaces', workspaceId, 'detail'] as const,
};

type CreateWorkspaceInput = InferRequestType<typeof $workspaces.$post>['json'];
type UpdateWorkspaceInput = InferRequestType<
  typeof $individualWorkspace.$patch
>['json'];

export type WorkspacesPageResponse = InferResponseType<
  typeof $workspaces.merged.$get,
  200
>;

export function useWorkspaces(search?: string) {
  return useInfiniteQuery({
    queryKey: [...workspaceKeys.merged(), search],

    initialPageParam: undefined as string | undefined,

    placeholderData: keepPreviousData,

    queryFn: async ({ pageParam }) => {
      const [res] = await Promise.all([
        $workspaces.merged.$get({
          query: {
            cursor: pageParam,
            limit: PAGINATION_LIMIT.toString(),
            search: search || undefined,
          },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);

      if (!res.ok) {
        throw new Error('Failed to fetch workspaces');
      }

      return res.json();
    },

    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useWorkspacesCompact(search?: string) {
  return useInfiniteQuery({
    queryKey: [...workspaceKeys.compact(), search],

    initialPageParam: undefined as string | undefined,

    placeholderData: keepPreviousData,

    queryFn: async ({ pageParam }) => {
      const [res] = await Promise.all([
        $workspaces.compact.$get({
          query: {
            cursor: pageParam,
            limit: '50',
            search: search || undefined,
          },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);

      if (!res.ok) {
        throw new Error('Failed to fetch workspaces');
      }

      return res.json();
    },

    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useWorkspaceByDirectory(directory: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(directory),
    queryFn: async () => {
      const res = await $workspaces.$get({
        query: { directory },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!directory,
    placeholderData: keepPreviousData,
  });
}

export function useWorkspace(directory: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(directory),
    queryFn: async () => {
      const res = await $workspaces.$get({
        query: { directory },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!directory,
    placeholderData: keepPreviousData,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateWorkspaceInput) => {
      const [res] = await Promise.all([
        $workspaces.$post({
          json: input,
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to create workspace');
      return res.json();
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.merged() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.compact() });
    },
  });
}

export function useUpdateWorkspace(id: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: UpdateWorkspaceInput) => {
      const [res] = await Promise.all([
        $individualWorkspace.$patch({
          param: { id },
          json: input,
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to update workspace');
      return res.json();
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.detail(id) });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.merged() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.compact() });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspaceId: string) => {
      const [res] = await Promise.all([
        $individualWorkspace.$delete({
          param: { id: workspaceId },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error('Failed to delete workspace');
      return res.json();
    },
    onSuccess: (_data, workspaceId) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.merged() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.compact() });
      queryClient.removeQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      });
    },
  });
}
