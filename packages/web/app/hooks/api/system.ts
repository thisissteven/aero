import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { honoClient } from '@/app/lib';

const $system = honoClient.api.system;

export const systemKeys = {
  system: () => ['system'] as const,
  files: ({
    harnessId,
    directory,
    query,
    limit,
  }: {
    harnessId?: string;
    directory?: string;
    query?: string;
    limit: string;
  }) =>
    [
      'system',
      harnessId ?? 'default',
      directory,
      'files',
      query,
      limit,
    ] as const,
};

export function useSystemApps() {
  return useQuery({
    queryKey: systemKeys.system(),
    queryFn: async () => {
      const res = await $system.editors.$get();
      if (!res.ok) return [];
      return res.json();
    },
  });
}

export function useFilesInDirectory({
  harnessId,
  directory,
  query,
  limit,
}: {
  harnessId?: string;
  directory?: string;
  query?: string;
  limit: string;
}) {
  return useQuery({
    queryKey: systemKeys.files({ harnessId, directory, query, limit }),
    queryFn: async () => {
      const res = await $system.files.$get({
        query: { harnessId, query, directory: directory as string, limit },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: !!directory,
    placeholderData: keepPreviousData,
  });
}
