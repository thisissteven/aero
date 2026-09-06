// app/hooks/config.ts

import { keepPreviousData, useMutation, useQuery } from '@tanstack/react-query';

import { honoClient } from '@/app/lib';
import { queryClient } from '@/app/providers';

const $config = honoClient.api.config;

export const configKeys = {
  detail: (harnessId?: string, directory?: string) =>
    ['config', harnessId ?? 'default', directory ?? 'root'] as const,
};

interface UseConfigOptions {
  harnessId?: string;
  directory?: string;
}

export function useConfig({ harnessId, directory }: UseConfigOptions = {}) {
  return useQuery({
    queryKey: configKeys.detail(harnessId, directory),
    queryFn: async () => {
      const res = await $config.$get({
        query: { harnessId, directory },
      });
      if (!res.ok) throw new Error('Failed to fetch configuration');
      return res.json();
    },
    placeholderData: keepPreviousData,
  });
}

export function useSetAutoAcceptPermissions({
  harnessId,
  directory,
}: UseConfigOptions = {}) {
  return useMutation({
    mutationFn: async (allowAll: boolean) => {
      const res = await $config.$post({
        query: { harnessId, directory },
        json: { allowAll },
      });
      if (!res.ok) throw new Error('Failed to set auto accept permissions');
      return res.json();
    },
    onSuccess: (_data) => {
      queryClient.invalidateQueries({
        queryKey: configKeys.detail(harnessId, directory),
      });
    },
  });
}
