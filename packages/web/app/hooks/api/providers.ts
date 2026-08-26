// app/hooks/providers.ts

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InferRequestType } from 'hono/client';

import { honoClient } from '@/app/lib';

const $providers = honoClient.api.providers;

export const providerKeys = {
  all: (harnessId?: string, directory?: string) =>
    ['providers', harnessId ?? 'default', directory ?? 'root'] as const,
  configured: (harnessId?: string, directory?: string) =>
    [
      'providers',
      'configured',
      harnessId ?? 'default',
      directory ?? 'root',
    ] as const,
};

type SetApiKeyInput = InferRequestType<typeof $providers.auth.$post>['json'];

interface UseProvidersOptions {
  harnessId?: string;
  directory?: string;
}

export function useProviders({
  harnessId,
  directory,
}: UseProvidersOptions = {}) {
  return useQuery({
    queryKey: providerKeys.all(harnessId, directory),
    queryFn: async () => {
      const res = await $providers.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch providers');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

export function useConfiguredProviders({
  harnessId,
  directory,
}: UseProvidersOptions = {}) {
  return useQuery({
    queryKey: providerKeys.configured(harnessId, directory),
    queryFn: async () => {
      const res = await $providers.configured.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch configured providers');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

export function useSetApiKey(harnessId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: SetApiKeyInput) => {
      const res = await $providers.auth.$post({
        query: { harnessId },
        json: input,
      });
      if (!res.ok) throw new Error('Failed to set API key');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['providers', harnessId ?? 'default'],
      });
    },
  });
}
