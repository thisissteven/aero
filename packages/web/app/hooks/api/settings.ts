import { useMutation, useQuery } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';

import { sessionKeys } from '@/app/hooks/api/sessions';
import { honoClient } from '@/app/lib';
import { queryClient } from '@/app/providers';
import type {
  AeroSettingPath,
  AeroSettingUpdate,
  AeroSettingValue,
} from '@/server/services/settings';
import { NEW_SESSION_PAGE_SESSION_ID } from '@/server/shared';

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

export async function getSetting<const P extends AeroSettingPath>(path: P) {
  const normalizedPath = [...path];

  const res = await $config.settings.$get({
    query: {
      path: JSON.stringify(normalizedPath),
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
}

export function useSetting<const P extends AeroSettingPath>(path: P) {
  const normalizedPath = [...path];

  return useQuery<SettingData<AeroSettingValue<P>>>({
    queryKey: configKeys.setting(path),

    enabled: normalizedPath.length > 0,

    queryFn: async () => {
      return await getSetting(path);
    },
  });
}

export async function updateSetting({ path, value }: SettingUpdate) {
  const normalizedPath = [...path];

  const res = await $config.settings.$patch({
    json: {
      path: normalizedPath,
      value,
    },
  });

  if (!res.ok) {
    throw new Error(`Failed to update setting: ${normalizedPath.join('.')}`);
  }

  const data = await res.json();

  return {
    path: data.path as typeof path,
    value: data.value as typeof value,
  };
}

export function useUpdateSetting() {
  return useMutation({
    mutationFn: updateSetting,

    onMutate: async ({ path, value }) => {
      const normalizedPath = [...path];
      const queryKey = configKeys.setting(path);

      await queryClient.cancelQueries({ queryKey });

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

      return { previous, queryKey };
    },

    onError: (_error, _variables, context) => {
      if (!context) return;
      queryClient.setQueryData(context.queryKey, context.previous);
    },

    onSuccess: (data, variables) => {
      // 1. Update the exact key
      queryClient.setQueryData(configKeys.setting(variables.path), data);

      // 2. Check for pinned message path and invalidate sessionKeys.pinned(sessionId)
      const [root, sessionId] = variables.path;

      if (
        root === 'pinnedSessionMessages' &&
        sessionId &&
        variables.path.length === 3
      ) {
        queryClient.invalidateQueries({
          queryKey: sessionKeys.pinned(sessionId as string),
        });
      }

      // 3. Invalidate generic parent query paths
      if (variables.path.length > 1) {
        const parentPath = variables.path.slice(0, -1);
        queryClient.invalidateQueries({
          queryKey: configKeys.setting(parentPath as AeroSettingPath),
        });
      }
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

export function useChatInputExpanded() {
  const { sessionId } = useParams({ strict: false });
  const resolvedSessionId = sessionId ?? NEW_SESSION_PAGE_SESSION_ID;
  const { data } = useSetting(['chatInputExpanded', resolvedSessionId]);
  return data?.value ?? false;
}
