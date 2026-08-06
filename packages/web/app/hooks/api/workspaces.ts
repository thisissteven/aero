// app/hooks/workspaces.ts
//
// Assumes lib/api.ts exports `client` from `hc<AppType>()`. Adjust the
// import path/name below if yours differs.

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';

import { honoClient } from '@/app/lib';

const $workspaces = honoClient.api.workspaces;
const $workspace = honoClient.api.workspaces[':id'];

export const workspaceKeys = {
  all: ['workspaces'] as const,
  detail: (id: string) => ['workspaces', id] as const,
};

type CreateWorkspaceInput = InferRequestType<typeof $workspaces.$post>['json'];
type WorkspaceListResponse = InferResponseType<typeof $workspaces.$get>;

export function useWorkspaces() {
  return useQuery({
    queryKey: workspaceKeys.all,
    queryFn: async (): Promise<WorkspaceListResponse> => {
      const res = await $workspaces.$get();
      if (!res.ok) throw new Error('Failed to fetch workspaces');
      return res.json();
    },
  });
}

export function useWorkspace(id: string) {
  return useQuery({
    queryKey: workspaceKeys.detail(id),
    queryFn: async () => {
      const res = await $workspace.$get({ param: { id } });
      if (!res.ok) throw new Error('Failed to fetch workspace');
      return res.json();
    },
    enabled: !!id,
  });
}

export function useCreateWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (input: CreateWorkspaceInput) => {
      const res = await $workspaces.$post({ json: input });
      if (!res.ok) throw new Error('Failed to create workspace');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
    },
  });
}

export function useDeleteWorkspace() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const res = await $workspace.$delete({ param: { id } });
      if (!res.ok) throw new Error('Failed to delete workspace');
      return res.json();
    },
    onSuccess: (_data, id) => {
      queryClient.invalidateQueries({ queryKey: workspaceKeys.all });
      queryClient.removeQueries({ queryKey: workspaceKeys.detail(id) });
    },
  });
}
