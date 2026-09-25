import { useMutation, useQuery } from '@tanstack/react-query';

import { apiError } from '@/app/hooks/i18n/api-errors';
import { honoClient } from '@/app/lib';

const $discovery = honoClient.api.discovery;

export function useDiscoverFavicon(directory: string | null, enabled = false) {
  return useQuery({
    queryKey: ['favicon-discovery', directory],
    queryFn: async () => {
      if (!directory) return null;

      const res = await $discovery.favicon.$get({
        query: { dir: directory, maxDepth: '5' },
      });

      if (!res.ok) {
        throw new Error(apiError('noFaviconFoundInDirectory'));
      }

      return res.json();
    },
    enabled: enabled && Boolean(directory),
    retry: false,
  });
}

export function useDiscoverScript() {
  return useMutation({
    mutationFn: async (targetDir: string) => {
      const res = await $discovery['discover-script'].$post({
        json: { targetDir },
      });

      if (!res.ok) {
        throw new Error(apiError('failedToDiscoverScript'));
      }

      return res.json();
    },
  });
}
