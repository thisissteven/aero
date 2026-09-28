import { keepPreviousData, useQuery } from '@tanstack/react-query';

import { apiError } from '@/app/hooks/i18n/api-errors';
import { honoClient } from '@/app/lib';
import type { ActivitySummary } from '@/server/services/activity';

const $activity = honoClient.api.activity;

export const activityKeys = {
  summary: (directory?: string) =>
    ['activity', 'summary', directory ?? 'all'] as const,
};

export function isStandaloneWorkspace(directory?: string) {
  return Boolean(directory?.includes('.aero/workspaces'));
}

export function useActivitySummary(directory?: string) {
  return useQuery<ActivitySummary>({
    queryKey: activityKeys.summary(directory),
    queryFn: async () => {
      const res = await $activity.$get({
        query: directory ? { directory } : {},
      });

      if (!res.ok) {
        throw new Error(apiError('failedToFetchActivity'));
      }

      return res.json();
    },
    staleTime: 60_000,
    refetchOnWindowFocus: false,
    placeholderData: keepPreviousData,
  });
}
