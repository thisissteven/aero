import { type QueryKey, useMutation } from '@tanstack/react-query';
import { useCallback, useRef } from 'react';
import { queryClient } from '@/app/providers';

export interface OptimisticMutationConfig<TData, TVariables> {
  queryKey: (variables: TVariables) => QueryKey;
  mutationFn: (variables: TVariables) => Promise<TData>;
  optimisticUpdate?: (
    current: TData | undefined,
    variables: TVariables,
  ) => TData | undefined;

  /**
   * If set, the *network* call (`mutationFn`) is debounced per queryKey:
   * rapid-fire mutate() calls within the window collapse into a single
   * request using the latest variables, while every call's onMutate still
   * fires synchronously (so the UI stays instant) and every caller's
   * promise still resolves/rejects off that one request.
   */
  debounceMs?: number;
}

export const staleProps = {
  staleTime: Infinity,
  refetchOnWindowFocus: false,
  refetchOnMount: false,
  refetchOnReconnect: false,
};

type Waiter<TData> = {
  resolve: (data: TData) => void;
  reject: (err: unknown) => void;
};

function useDebouncedFn<TData, TVariables>(
  fn: (variables: TVariables) => Promise<TData>,
  keyOf: (variables: TVariables) => string,
  ms: number | undefined,
) {
  const timers = useRef(new Map<string, ReturnType<typeof setTimeout>>());
  const queues = useRef(new Map<string, Waiter<TData>[]>());

  return useCallback(
    (variables: TVariables) => {
      if (!ms) return fn(variables);

      const key = keyOf(variables);

      return new Promise<TData>((resolve, reject) => {
        const queue = queues.current.get(key) ?? [];
        queue.push({ resolve, reject });
        queues.current.set(key, queue);

        const existing = timers.current.get(key);
        if (existing) clearTimeout(existing);

        // last `variables` in the burst wins — that's what actually gets sent
        timers.current.set(
          key,
          setTimeout(async () => {
            timers.current.delete(key);
            const waiters = queues.current.get(key) ?? [];
            queues.current.delete(key);

            try {
              const data = await fn(variables);
              waiters.forEach(({ resolve: r }) => r(data));
            } catch (err) {
              waiters.forEach(({ reject: r }) => r(err));
            }
          }, ms),
        );
      });
    },
    [fn, keyOf, ms],
  );
}

export function useOptimisticMutation<TData, TVariables>({
  queryKey,
  mutationFn,
  optimisticUpdate,
  debounceMs = 300,
}: OptimisticMutationConfig<TData, TVariables>) {
  const debouncedMutationFn = useDebouncedFn(
    mutationFn,
    (variables) => JSON.stringify(queryKey(variables)),
    debounceMs,
  );

  return useMutation({
    mutationFn: debouncedMutationFn,

    onMutate: async (variables) => {
      if (!optimisticUpdate) return undefined;

      const key = queryKey(variables);
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<TData>(key);

      queryClient.setQueryData<TData>(key, (current) =>
        optimisticUpdate(current, variables),
      );

      return { previous, key };
    },

    onError: (_error, _variables, context) => {
      if (context) {
        queryClient.setQueryData(context.key, context.previous);
      }
    },

    onSuccess: (data, variables) => {
      queryClient.setQueryData(queryKey(variables), data);
    },
  });
}
