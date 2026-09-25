import { useMutation, useQuery } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import { apiError } from '@/app/hooks/i18n/api-errors';
import { honoClient } from '@/app/lib';
import { queryClient } from '@/app/providers';
import { useSessionId } from '@/app/providers/SessionIdProvider';
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
    throw new Error(apiError('failedToFetchSetting', normalizedPath.join('.')));
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
    throw new Error(
      apiError('failedToUpdateSetting', normalizedPath.join('.')),
    );
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
      queryClient.setQueryData(configKeys.setting(variables.path), data);

      if (variables.path.length > 1) {
        const parentPath = variables.path.slice(0, -1);
        queryClient.invalidateQueries({
          queryKey: configKeys.setting(parentPath as AeroSettingPath),
        });
      }
    },
  });
}

export function usePermissionAutoAccept(sessionId: string) {
  return useSetting(['permissionAutoAcceptSessions', sessionId]);
}

export function useGoalMode(sessionId: string) {
  return useSetting(['goalMode', sessionId]);
}

export function useChatInputExpanded() {
  const sessionId = useSessionId();
  const resolvedSessionId = sessionId ?? NEW_SESSION_PAGE_SESSION_ID;
  const { data } = useSetting(['chatInputExpanded', resolvedSessionId]);
  return data?.value ?? false;
}

/**
 * Returns the list of hidden model IDs for the given provider.
 * Falls back to an empty array when the provider has no hidden models.
 */
export function useHiddenModels(providerId: string | null | undefined) {
  const { data } = useSetting(['hiddenModels', providerId ?? '']);
  return data?.value ?? [];
}

/**
 * Set of pinned session IDs. Falls back to an empty set while the setting is
 * loading so consumers can treat every session as unpinned.
 */
export function usePinnedSessions() {
  const { data } = useSetting(['pinnedSessions']);
  const ids = data?.value;
  return useMemo(() => new Set(ids ?? []), [ids]);
}

export function useIsSessionPinned(sessionId: string) {
  return usePinnedSessions().has(sessionId);
}

/**
 * Toggles a session's pinned state. The whole `pinnedSessions` list is written
 * so the sidebar regroups optimistically in the same commit, then reconciles
 * with the server response.
 */
export function useTogglePinnedSession() {
  const { mutate } = useUpdateSetting();
  const pinnedSessions = usePinnedSessions();

  return useCallback(
    (sessionId: string) => {
      const next = new Set(pinnedSessions);

      if (next.has(sessionId)) next.delete(sessionId);
      else next.add(sessionId);

      mutate({ path: ['pinnedSessions'], value: [...next] });
    },
    [mutate, pinnedSessions],
  );
}
