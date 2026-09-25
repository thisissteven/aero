// app/hooks/providers.ts

import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InferRequestType } from 'hono/client';
import { useMemo } from 'react';
import { configKeys, getSetting } from '@/app/hooks/api/settings';
import { apiError } from '@/app/hooks/i18n/api-errors';
import { staleProps } from '@/app/hooks/useOptimisticMutation';
import { honoClient } from '@/app/lib';
import { type AeroSettingPath } from '@/server/services/settings';

const $providers = honoClient.api.providers;

export const providerKeys = {
  all: (harnessId?: string, directory?: string) =>
    ['providers', harnessId ?? 'default', directory ?? 'root'] as const,
  compact: (harnessId?: string, directory?: string) =>
    [
      'providers',
      'compact',
      harnessId ?? 'default',
      directory ?? 'root',
    ] as const,
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
      if (!res.ok) throw new Error(apiError('failedToFetchProviders'));
      return res.json();
    },
    ...staleProps,
    placeholderData: keepPreviousData,
  });
}

export function useProvidersCompact({
  harnessId,
  directory,
}: UseProvidersOptions = {}) {
  return useQuery({
    queryKey: providerKeys.compact(harnessId, directory),
    queryFn: async () => {
      const res = await $providers.compact.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error(apiError('failedToFetchProviders'));
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
      if (!res.ok)
        throw new Error(apiError('failedToFetchConfiguredProviders'));
      return res.json();
    },
    ...staleProps,
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
      if (!res.ok) throw new Error(apiError('failedToSetApiKey'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['providers', harnessId ?? 'default'],
      });
    },
  });
}

export function useDisconnectProvider(harnessId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: { provider: string }) => {
      const res = await $providers.disconnect.$post({
        query: { harnessId },
        json: input,
      });
      if (!res.ok) throw new Error(apiError('failedToDisconnectProvider'));
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['providers', harnessId ?? 'default'],
      });
    },
  });
}

/**
 * Fetches the whole `hiddenModels` record: { [providerId]: string[] }.
 *
 * Note: `['hiddenModels']` isn't a leaf in the derived AeroSettingPath type,
 * so we cast. Runtime-wise `getSetting` walks the path and returns the
 * full record, which is exactly what we want here.
 */
export function useHiddenModelsMap() {
  const path = ['hiddenModels'] as unknown as AeroSettingPath;

  const { data } = useQuery({
    queryKey: configKeys.setting(path),
    queryFn: async (): Promise<Record<string, string[]>> => {
      const result = await getSetting(path);
      // `getSetting`'s return type distributes badly when `P` is the full
      // union, so we reassert the runtime shape here.
      const wrapped = result as unknown as {
        value?: Record<string, string[]>;
      };
      return wrapped.value ?? {};
    },
  });

  return data ?? {};
}

/**
 * Configured providers with hidden models stripped out.
 *
 * Use this anywhere the user is expected to pick / see models.
 * For the settings page where hidden models must remain visible (dimmed),
 * keep using `useConfiguredProviders` directly.
 */
export function usePreparedConfiguredProviders({
  harnessId,
  directory,
}: UseProvidersOptions = {}) {
  const raw = useConfiguredProviders({ harnessId, directory });
  const hiddenMap = useHiddenModelsMap();

  const data = useMemo(() => {
    if (!raw.data) return raw.data;

    return raw.data.map((provider) => {
      const hidden = hiddenMap[provider.id];
      if (!hidden || hidden.length === 0) return provider;

      const hiddenSet = new Set(hidden);
      const models = Object.fromEntries(
        Object.entries(provider.models ?? {}).filter(
          ([, model]) => !hiddenSet.has(model.id),
        ),
      );

      return { ...provider, models };
    });
  }, [raw.data, hiddenMap]);

  return { ...raw, data };
}
