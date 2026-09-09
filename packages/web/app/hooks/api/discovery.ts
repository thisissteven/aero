import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

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

export function useRunScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (directory: string) => {
      const res = await $discovery['run-script'].$post({
        json: { directory },
      });

      if (!res.ok) {
        throw new Error('Failed to run script');
      }

      return res.json();
    },
    onSuccess: (_, directory) => {
      // Instantly invalidate and refresh status for this directory
      queryClient.invalidateQueries({ queryKey: ['script-status', directory] });
    },
  });
}

export function useStopScript() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (directory: string) => {
      const res = await $discovery['stop-script'].$post({
        json: { directory },
      });

      if (!res.ok) {
        throw new Error('Failed to stop script');
      }

      return res.json();
    },
    onSuccess: (_, directory) => {
      queryClient.invalidateQueries({ queryKey: ['script-status', directory] });
    },
  });
}

export function useScriptStatus(directory: string | null, enabled = true) {
  return useQuery({
    queryKey: ['script-status', directory],
    queryFn: async () => {
      if (!directory) return { status: 'idle' as const, url: null };

      const res = await $discovery['script-status'].$get({
        query: { directory },
      });

      if (!res.ok) {
        throw new Error('Failed to fetch script status');
      }

      return res.json();
    },
    enabled: enabled && Boolean(directory),
    // Automatically poll every 2 seconds if the script is currently starting up
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.status === 'starting' ? 2000 : false;
    },
  });
}
