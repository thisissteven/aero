import { useMutation, useQuery } from '@tanstack/react-query';

import { honoClient } from '@/app/lib';
import { queryClient } from '@/app/providers';
import type {
  AeroSettingPath,
  AeroSettingUpdate,
  AeroSettingValue,
} from '@/server/services/settings';

const $config = honoClient.api.config;

export type SettingPath = AeroSettingPath;
export type SettingUpdate = AeroSettingUpdate;

export interface SettingData<T> {
  path: AeroSettingPath;
  value: T | undefined;
}

export const configKeys = {
  setting: (path: SettingPath) => ['config', 'settings', ...path] as const,
};

export function useSetting<const P extends AeroSettingPath>(path: P) {
  const normalizedPath = [...path];

  return useQuery<SettingData<AeroSettingValue<P>>>({
    queryKey: configKeys.setting(path),

    enabled: normalizedPath.length > 0,

    queryFn: async () => {
      const res = await $config.settings.$get({
        query: {
          path: normalizedPath.join('.'),
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch setting: ${normalizedPath.join('.')}`);
      }

      const data = await res.json();

      return {
        path: data.path as P,
        value: data.value as AeroSettingValue<P> | undefined,
      };
    },
  });
}

export function useUpdateSetting() {
  return useMutation({
    mutationFn: async ({ path, value }: SettingUpdate) => {
      const normalizedPath = [...path];

      const res = await $config.settings.$patch({
        json: {
          path: normalizedPath,
          value,
        },
      });

      if (!res.ok) {
        throw new Error(
          `Failed to update setting: ${normalizedPath.join('.')}`,
        );
      }

      const data = await res.json();

      return {
        path: data.path as typeof path,
        value: data.value as typeof value,
      };
    },

    onMutate: async ({ path, value }) => {
      const normalizedPath = [...path];
      const queryKey = configKeys.setting(path);

      await queryClient.cancelQueries({
        queryKey,
      });

      const previous =
        queryClient.getQueryData<SettingData<AeroSettingValue<typeof path>>>(
          queryKey,
        );

      queryClient.setQueryData(
        queryKey,
        (current: SettingData<AeroSettingValue<typeof path>> | undefined) => {
          if (!current) {
            return {
              path: normalizedPath,
              value,
            };
          }

          return {
            ...current,
            value,
          };
        },
      );

      return {
        previous,
        queryKey,
      };
    },

    onError: (_error, _variables, context) => {
      if (!context) return;

      queryClient.setQueryData(context.queryKey, context.previous);
    },

    onSuccess: (data, variables) => {
      queryClient.setQueryData(configKeys.setting(variables.path), data);
    },
  });
}

export function usePinnedSessionMessage(sessionId: string, messageId: string) {
  return useSetting(['pinnedSessionMessages', sessionId, messageId]);
}

export function usePermissionAutoAccept(sessionId: string) {
  return useSetting(['permissionAutoAcceptSessions', sessionId]);
}

export function useGoalMode(sessionId: string) {
  return useSetting(['goalMode', sessionId]);
}

export function useChatInputExpanded(sessionId: string) {
  return useSetting(['chatInputExpanded', sessionId]);
}
