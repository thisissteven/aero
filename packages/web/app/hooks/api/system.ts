import { useQuery } from '@tanstack/react-query';

import { honoClient } from '@/app/lib';

const $system = honoClient.api.system;

export function useSystemApps() {
  return useQuery({
    queryKey: ['system'],
    queryFn: async () => {
      const res = await $system.editors.$get();
      if (!res.ok) return null;
      return res.json();
    },
  });
}
