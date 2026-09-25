import type { InfiniteData } from '@tanstack/react-query';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';

import { useWorkspaceStore } from '@/app/components/chat-sidebar/workspace/workspaces-store';
import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { apiError } from '@/app/hooks/i18n/api-errors';
import { honoClient, PAGINATION_LIMIT } from '@/app/lib';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

const $workspaces = honoClient.api.workspaces;
const $individualWorkspace = honoClient.api.workspaces[':id'];

export const workspaceKeys = {
  merged: () => ['workspaces', 'default'] as const,
  keys: () => ['workspaces', 'keys'] as const,
  compact: () => ['workspaces', 'compact'] as const,
  detail: (workspaceId: string) =>
    ['workspaces', workspaceId, 'detail'] as const,
};

type CreateWorkspaceInput = InferRequestType<typeof $workspaces.$post>['json'];
type UpdateWorkspaceInput = InferRequestType<
  typeof $individualWorkspace.$patch
>['json'];
type ReorderWorkspacesInput = InferRequestType<
  typeof $workspaces.order.$patch
>['json'];

export type WorkspacesPageResponse = InferResponseType<
  typeof $workspaces.merged.$get,
  200
>;

type WorkspacesInfiniteData = InfiniteData<
  WorkspacesPageResponse,
  string | undefined
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
        throw new Error(apiError('failedToFetchWorkspaces'));
      }

      return res.json();
    },

    getNextPageParam: (lastPage) => lastPage.nextCursor,
  });
}

export function useWorkspacesKeys() {
  return useQuery({
    queryKey: [...workspaceKeys.keys()],

    queryFn: async ({ pageParam }) => {
      const [res] = await Promise.all([
        $workspaces.keys.$get({
          query: {
            cursor: pageParam,
          },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);

      if (!res.ok) {
        throw new Error(apiError('failedToFetchWorkspaces'));
      }

      return res.json();
    },
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
        throw new Error(apiError('failedToFetchWorkspaces'));
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
      if (!res.ok) return [];
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
      if (!res.ok) throw new Error(apiError('failedToCreateWorkspace'));
      return res.json();
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.merged() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.compact() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.keys() });
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
      if (!res.ok) throw new Error(apiError('failedToUpdateWorkspace'));
      return res.json();
    },
    onSuccess: (_data, input) => {
      if (input.directory) {
        queryClient.invalidateQueries({
          queryKey: workspaceKeys.detail(input.directory),
        });
      }
      queryClient.invalidateQueries({ queryKey: workspaceKeys.merged() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.compact() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.keys() });
    },
  });
}

export function useReorderWorkspaces() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: ReorderWorkspacesInput) => {
      const [res] = await Promise.all([
        $workspaces.order.$patch({
          json: input,
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error(apiError('failedToUpdateWorkspace'));
      return res.json();
    },
    onMutate: async ({ ids }) => {
      await queryClient.cancelQueries({ queryKey: workspaceKeys.merged() });

      const previous = queryClient.getQueriesData<WorkspacesInfiniteData>({
        queryKey: workspaceKeys.merged(),
      });

      const positionById = new Map(ids.map((id, index) => [id, index]));

      queryClient.setQueriesData<WorkspacesInfiniteData>(
        { queryKey: workspaceKeys.merged() },
        (current) => {
          if (!current) return current;

          const items = current.pages.flatMap((page) => page.items);

          const sorted = [...items].sort((a, b) => {
            const aIndex = positionById.get(a.id);
            const bIndex = positionById.get(b.id);

            if (aIndex === undefined && bIndex === undefined) return 0;
            if (aIndex === undefined) return 1;
            if (bIndex === undefined) return -1;
            return aIndex - bIndex;
          });

          let offset = 0;
          const pages = current.pages.map((page) => {
            const pageItems = sorted.slice(offset, offset + page.items.length);
            offset += page.items.length;
            return { ...page, items: pageItems };
          });

          return { ...current, pages };
        },
      );

      return { previous };
    },
    onError: (_error, _variables, context) => {
      if (!context) return;
      for (const [queryKey, data] of context.previous) {
        queryClient.setQueryData(queryKey, data);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.merged() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.compact() });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (workspace: AeroWorkspaceSummary) => {
      const [res] = await Promise.all([
        $individualWorkspace.$delete({
          param: { id: workspace.id },
        }),
        new Promise((resolve) => setTimeout(resolve, 100)),
      ]);
      if (!res.ok) throw new Error(apiError('failedToDeleteWorkspace'));
      return res.json();
    },
    onSuccess: (_data, workspace) => {
      const selectedWorkspace = useNewSessionStore.getState().selectedWorkspace;
      if (
        selectedWorkspace &&
        selectedWorkspace.directory === workspace.directory
      ) {
        useNewSessionStore.getState().setSelectedWorkspace(undefined);
      }
      queryClient.invalidateQueries({ queryKey: workspaceKeys.merged() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.compact() });
      queryClient.invalidateQueries({ queryKey: workspaceKeys.keys() });
      queryClient.removeQueries({
        queryKey: workspaceKeys.detail(workspace.id),
      });
      useWorkspaceStore.getState().setState('all');
    },
  });
}
