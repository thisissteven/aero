import { useCallback, useState } from 'react';

import { toast } from '@aero/ui';

interface AnimatedActionConfig {
  animationDuration?: number;
}

interface ActionOptions<T> {
  action: () => Promise<T>;
  refetch?: () => Promise<unknown>;
  messages: {
    loading: string;
    success: string;
    error?: (err: Error) => string;
  };
}

export function useAnimatedAction(config: AnimatedActionConfig = {}) {
  const { animationDuration = 500 } = config;
  const [isExiting, setIsExiting] = useState(false);

  const execute = useCallback(
    async <T>({ action, refetch, messages }: ActionOptions<T>) => {
      setIsExiting(true);

      await new Promise((resolve) => setTimeout(resolve, animationDuration));

      return toast.promise(
        (async () => {
          try {
            const result = await action();
            if (refetch) {
              await refetch();
            }
            return result;
          } finally {
            setIsExiting(false);
          }
        })(),
        {
          loading: messages.loading,
          success: messages.success,
          error: (err: Error) =>
            messages.error
              ? messages.error(err)
              : (err.message ?? 'An error occurred'),
        },
      );
    },
    [animationDuration],
  );

  return {
    isExiting,
    execute,
  };
}
