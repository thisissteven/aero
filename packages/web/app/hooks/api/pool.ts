import { Query, useMutation, useQuery } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import { honoClient } from '@/app/lib';
import { queryClient } from '@/app/providers';

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
    onSuccess: () => {
      queryClient.removeQueries({
        predicate: (q: Query) => {
          if (!Array.isArray(q.queryKey)) return false;
          const head = q.queryKey[0];
          if (head === 'system') return q.queryKey.includes('files');
          if (head === 'capabilities') return true;
          if (head === 'providers') return true;
          if (head === 'pool') return true;
          return false;
        },
      });
    },
  });
}

type PoolStatus = {
  v2: {
    poolSize: number;
    totalActiveRequests: number;
    healthyNodesCount: number;
    nodes: unknown[];
  };
  combinedNodesCount: number;
};

const POLL_INTERVAL = 500;

const poolStatusQueryKey = ['pool', 'status'] as const;

async function fetchPoolStatus(): Promise<PoolStatus> {
  const response = await fetch('/api/pool');
  if (!response.ok) {
    throw new Error(`Pool endpoint returned ${response.status}`);
  }
  return response.json();
}

export function usePoolStatus() {
  return useQuery({
    queryKey: poolStatusQueryKey,
    queryFn: fetchPoolStatus,
    // Poll every 500ms until the pool has healthy nodes, then stop.
    refetchInterval: (query) => {
      const data = query.state.data;
      if (data && data.v2.healthyNodesCount > 0) return false;
      return POLL_INTERVAL;
    },
    // Keep polling even while the endpoint is erroring/unreachable.
    retry: false,
    refetchOnWindowFocus: false,
  });
}

export function usePoolReady() {
  const { data } = usePoolStatus();
  const restartRequestedRef = useRef(false);

  useEffect(() => {
    if (!data) return;

    // Healthy again — reset the guard so a future failure can restart again.
    if (data.v2.healthyNodesCount > 0) {
      restartRequestedRef.current = false;
      return;
    }

    const hasNoActivePools =
      data.v2.poolSize === 0 &&
      data.v2.healthyNodesCount === 0 &&
      data.v2.nodes.length === 0 &&
      data.combinedNodesCount === 0;

    if (!hasNoActivePools || restartRequestedRef.current) return;

    restartRequestedRef.current = true;

    void (async () => {
      try {
        const res = await fetch('/api/pool/restart', { method: 'POST' });
        if (!res.ok) restartRequestedRef.current = false;
      } catch {
        restartRequestedRef.current = false;
      }
    })();
  }, [data]);

  return (data?.v2.healthyNodesCount ?? 0) > 0;
}
