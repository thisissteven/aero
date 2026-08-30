import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { InferResponseType } from 'hono/client';

import { honoClient, PAGINATION_LIMIT } from '@/app/lib';

const $workspaces = honoClient.api.workspaces;
const $individualWorkspace = honoClient.api.workspaces[':id'];

export const workspaceKeys = {
  merged: () => ['workspaces', 'default'] as const,
  compact: () => ['workspaces', 'compact'] as const,
  detail: (workspaceId: string) =>
    ['workspaces', workspaceId, 'detail'] as const,
};

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

export function useWorkspace(workspaceId: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(workspaceId),
    queryFn: async () => {
      const res = await $individualWorkspace.$get({
        param: { id: workspaceId },
      });
      if (!res.ok) return null;
      return res.json();
    },
    enabled: !!workspaceId,
    placeholderData: keepPreviousData,
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
      queryClient.removeQueries({
        queryKey: workspaceKeys.detail(workspaceId),
      });
    },
  });
}
