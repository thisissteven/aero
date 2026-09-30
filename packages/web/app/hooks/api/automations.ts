import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';

import { honoClient } from '@/app/lib';
import type {
  AeroAutomation,
  AeroAutomationStatusSummary,
} from '@/server/services/harness/types';

const $automations = honoClient.api.automations;
const $workspace = $automations[':workspaceId'];
const $task = $workspace[':taskId'];

export type AutomationDraft = Partial<AeroAutomation> & {
  id?: string;
  name?: string;
  enabled?: boolean;
  schedule?: AeroAutomation['schedule'];
  execution?: AeroAutomation['execution'];
};

export const automationKeys = {
  all: (workspaceId?: string) =>
    ['automations', workspaceId ?? 'none'] as const,
  status: () => ['automations', 'status'] as const,
};

export function useAutomations(workspaceId?: string) {
  return useQuery({
    queryKey: automationKeys.all(workspaceId),
    queryFn: async (): Promise<AeroAutomation[]> => {
      const res = await $workspace.$get({
        param: { workspaceId: workspaceId! },
      });
      if (!res.ok) throw new Error('Failed to load automations');
      const data = await res.json();
      return data.tasks;
    },
    enabled: !!workspaceId,
  });
}

export function useUpsertAutomation(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (task: AutomationDraft) => {
      const res = await $workspace.$put({
        param: { workspaceId: workspaceId! },
        json: { task },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { error?: string } | null)?.error ??
            'Failed to save automation',
        );
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: automationKeys.all(workspaceId) });
      qc.invalidateQueries({ queryKey: automationKeys.status() });
    },
  });
}

export function useDeleteAutomation(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await $task.$delete({
        param: { workspaceId: workspaceId!, taskId },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { error?: string } | null)?.error ??
            'Failed to delete automation',
        );
      }
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: automationKeys.all(workspaceId) });
      qc.invalidateQueries({ queryKey: automationKeys.status() });
    },
  });
}

export function useRunAutomation(workspaceId?: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (taskId: string) => {
      const res = await $task.run.$post({
        param: { workspaceId: workspaceId!, taskId },
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { error?: string } | null)?.error ??
            'Failed to run automation',
        );
      }
      return res.json() as Promise<{ ok: boolean; sessionId?: string }>;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: automationKeys.all(workspaceId) });
      qc.invalidateQueries({ queryKey: automationKeys.status() });
    },
  });
}

export function useAutomationStatus() {
  return useQuery({
    queryKey: automationKeys.status(),
    queryFn: async (): Promise<AeroAutomationStatusSummary> => {
      const res = await $automations.status.$get();
      if (!res.ok) throw new Error('Failed to load automation status');
      return res.json();
    },
  });
}

/**
 * Subscribe to the server's automation run event stream. Invalidates the
 * workspace's list whenever a run transitions so the UI reflects status
 * without polling.
 */
export function useAutomationEvents(workspaceId?: string, enabled = true) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return;

    const source = new EventSource('/api/automations/events');
    const onRun = (event: MessageEvent<string>) => {
      try {
        const parsed = JSON.parse(event.data) as { workspaceId?: string };
        if (
          workspaceId &&
          parsed.workspaceId &&
          parsed.workspaceId !== workspaceId
        ) {
          return;
        }
      } catch {
        //
      }
      qc.invalidateQueries({ queryKey: automationKeys.all(workspaceId) });
      qc.invalidateQueries({ queryKey: automationKeys.status() });
    };

    source.addEventListener('scheduled-task-ran', onRun as EventListener);
    return () => {
      source.removeEventListener('scheduled-task-ran', onRun as EventListener);
      source.close();
    };
  }, [qc, workspaceId, enabled]);
}
