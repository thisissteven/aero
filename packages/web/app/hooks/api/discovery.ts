import { useMutation, useQuery } from '@tanstack/react-query';

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
        throw new Error('No favicon found in directory');
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
        throw new Error('Failed to discover script');
      }

      return res.json();
    },
  });
}
