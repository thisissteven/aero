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

import { useEffect, useState } from 'react';

type PoolStatus = {
  v1: {
    poolSize: number;
    totalActiveRequests: number;
    healthyNodesCount: number;
    nodes: unknown[];
  };
  v2: {
    poolSize: number;
    totalActiveRequests: number;
    healthyNodesCount: number;
    nodes: unknown[];
  };
  combinedNodesCount: number;
};

const POLL_INTERVAL = 500;

export function usePoolReady() {
  const [isPoolReady, setIsPoolReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let restartRequested = false;

    const scheduleCheck = () => {
      if (cancelled) return;

      timeout = setTimeout(() => {
        void checkPool();
      }, POLL_INTERVAL);
    };

    const checkPool = async () => {
      try {
        const response = await fetch('/api/pool');

        // The pool endpoint itself must be reachable before
        // we consider restarting anything.
        if (!response.ok) {
          scheduleCheck();
          return;
        }

        const pool: PoolStatus = await response.json();

        const v1Healthy = pool.v1.healthyNodesCount > 0;
        const v2Healthy = pool.v2.healthyNodesCount > 0;

        if (v1Healthy && v2Healthy) {
          if (!cancelled) {
            setIsPoolReady(true);
          }
          return;
        }

        // Only restart when the endpoint is reachable and
        // there are clearly no active pool nodes at all.
        const hasNoActivePools =
          pool.v1.poolSize === 0 &&
          pool.v2.poolSize === 0 &&
          pool.v1.healthyNodesCount === 0 &&
          pool.v2.healthyNodesCount === 0 &&
          pool.v1.nodes.length === 0 &&
          pool.v2.nodes.length === 0 &&
          pool.combinedNodesCount === 0;

        if (hasNoActivePools && !restartRequested) {
          restartRequested = true;

          try {
            const restartResponse = await fetch('/api/pool/restart', {
              method: 'POST',
            });

            // If restart itself failed, allow another attempt only
            // if the pool still clearly remains completely empty.
            if (!restartResponse.ok) {
              restartRequested = false;
            }
          } catch {
            restartRequested = false;
          }
        }
      } catch {
        // Pool endpoint is unreachable.
        // Do NOT restart. Just keep polling.
      }

      scheduleCheck();
    };

    void checkPool();

    return () => {
      cancelled = true;

      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  return isPoolReady;
}
