import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';

import { honoClient } from '@/app/lib';
import type { Snippet } from '@/server/services/snippets';

const $snippets = honoClient.api.snippets;
const $snippet = honoClient.api.snippets[':id'];

export const snippetKeys = {
  all: (directory?: string) => ['snippets', directory ?? 'global'] as const,
};

export type SnippetsResponse = InferResponseType<typeof $snippets.$get, 200>;
export type SnippetItem = SnippetsResponse[number];

type CreateSnippetInput = InferRequestType<typeof $snippets.$post>['json'];
type UpdateSnippetInput = InferRequestType<typeof $snippet.$patch>['json'];

/**
 * Snippets visible for a directory: global snippets plus any workspace
 * snippet scoped to that directory. Omit `directory` to get global only.
 */
export function useSnippets(directory?: string) {
  return useQuery({
    queryKey: snippetKeys.all(directory),
    queryFn: async () => {
      const res = await $snippets.$get({ query: { directory } });
      if (!res.ok) throw new Error('Failed to fetch snippets');
      return (await res.json()) as SnippetItem[];
    },
  });
}

export function useCreateSnippet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateSnippetInput) => {
      const res = await $snippets.$post({ json: input });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? 'Failed to create snippet');
      }
      return (await res.json()) as Snippet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snippets'] });
    },
  });
}

export function useUpdateSnippet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: UpdateSnippetInput & { id: string }) => {
      const res = await $snippet.$patch({ param: { id }, json: input });
      if (!res.ok) {
        const body = (await res.json().catch(() => null)) as {
          error?: string;
        } | null;
        throw new Error(body?.error ?? 'Failed to update snippet');
      }
      return (await res.json()) as Snippet;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snippets'] });
    },
  });
}

export function useDeleteSnippet() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const res = await $snippet.$delete({ param: { id } });
      if (!res.ok) throw new Error('Failed to delete snippet');
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['snippets'] });
    },
  });
}
