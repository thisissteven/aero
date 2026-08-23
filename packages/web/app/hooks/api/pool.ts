import { useMutation, useQuery } from '@tanstack/react-query';

import { honoClient } from '@/app/lib';

const $pool = honoClient.api.pool;

export function useOpencodeVersion() {
  return useQuery({
    queryKey: ['opencode', 'version'],
    queryFn: async () => {
      const res = await $pool.version.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });
}

export function useReloadOpencode() {
  return useMutation({
    mutationFn: async () => {
      const res = await $pool.restart.$post();
      if (!res.ok) return null;
      return res.json();
    },
  });
}
