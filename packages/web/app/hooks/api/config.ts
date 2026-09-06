import { useMutation, useQuery } from '@tanstack/react-query';

import { honoClient } from '@/app/lib';
import { queryClient } from '@/app/providers';

const $config = honoClient.api.config;

export const configKeys = {
  booleanSetting: (setting: BooleanSetting, sessionId: string) =>
    ['config', 'settings', setting, sessionId] as const,
};

export type BooleanSetting =
  'goalMode' | 'chatInputExpanded' | 'permissionAutoAcceptSessions';

export interface BooleanSettingData {
  sessionId: string;
  value: boolean;
}

export function useBooleanSetting(setting: BooleanSetting, sessionId: string) {
  return useQuery({
    queryKey: configKeys.booleanSetting(setting, sessionId),
    enabled: Boolean(sessionId),

    queryFn: async () => {
      const res = await $config.settings[':setting'][':id'].$get({
        param: {
          setting,
          id: sessionId,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to fetch ${setting}`);
      }

      return res.json();
    },
  });
}

export function useToggleBooleanSetting(setting: BooleanSetting) {
  return useMutation({
    mutationFn: async (sessionId: string) => {
      const res = await $config.settings[':setting'][':id'].toggle.$post({
        param: {
          setting,
          id: sessionId,
        },
      });

      if (!res.ok) {
        throw new Error(`Failed to toggle ${setting}`);
      }

      return res.json();
    },

    onMutate: async (sessionId) => {
      const queryKey = configKeys.booleanSetting(setting, sessionId);

      await queryClient.cancelQueries({ queryKey });

      const previous = queryClient.getQueryData<BooleanSettingData>(queryKey);

      queryClient.setQueryData<BooleanSettingData>(queryKey, (current) => {
        if (!current) return current;

        return {
          ...current,
          value: !current.value,
        };
      });

      return {
        previous,
        queryKey,
      };
    },

    onError: (_error, _sessionId, context) => {
      if (!context) return;

      queryClient.setQueryData(context.queryKey, context.previous);
    },

    onSuccess: (data, sessionId) => {
      queryClient.setQueryData(
        configKeys.booleanSetting(setting, sessionId),
        data,
      );
    },
  });
}

export function usePermissionAutoAccept(sessionId: string) {
  return useBooleanSetting('permissionAutoAcceptSessions', sessionId);
}

export function useTogglePermissionAutoAccept() {
  return useToggleBooleanSetting('permissionAutoAcceptSessions');
}

export function useGoalMode(sessionId: string) {
  return useBooleanSetting('goalMode', sessionId);
}

export function useToggleGoalMode() {
  return useToggleBooleanSetting('goalMode');
}

export function useChatInputExpanded(sessionId: string) {
  return useBooleanSetting('chatInputExpanded', sessionId);
}

export function useToggleChatInputExpanded() {
  return useToggleBooleanSetting('chatInputExpanded');
}
