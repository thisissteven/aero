// app/hooks/api/session-goal.ts
//
// Live session-goal state and lifecycle actions. The goal payload rides
// `session.metadata.aero.goal`, so subscribing to the session detail query is
// all the plumbing needed for live updates.

import { useQueryClient } from '@tanstack/react-query';
import { useCallback } from 'react';
import {
  type AeroGoalPayload,
  fitGoalObjective,
  getSessionGoal,
} from '@/app/features/chat-page/session-goal/goal-utils';
import {
  deleteGoalObjectiveFile,
  goalKeys,
  writeGoalObjectiveFile,
} from '@/app/hooks/api/goals';
import {
  useAbortSession,
  usePatchAeroMetadata,
  useSession,
} from '@/app/hooks/api/sessions';
import { useSetting } from '@/app/hooks/api/settings';

const createGoalId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

const normalizeBudget = (budget: number | null | undefined): number | null =>
  typeof budget === 'number' && Number.isFinite(budget) && budget > 0
    ? Math.floor(budget)
    : null;

export function useSessionGoalEnabled() {
  const { data } = useSetting(['sessionGoalEnabled']);
  return data?.value !== false;
}

export function useSessionGoal(sessionId: string | null | undefined) {
  const resolved = sessionId ?? '';
  const { data: session } = useSession(undefined, resolved);
  const enabled = useSessionGoalEnabled();

  return {
    session: session ?? null,
    goal: getSessionGoal(session?.metadata),
    enabled,
  };
}

export function useGoalActions(
  sessionId: string,
  goal: AeroGoalPayload | null,
) {
  const patchAero = usePatchAeroMetadata(undefined, sessionId);
  const { mutateAsync: abortSession } = useAbortSession(undefined);
  const queryClient = useQueryClient();

  const invalidateObjective = useCallback(() => {
    void queryClient.invalidateQueries({
      queryKey: goalKeys.objective(sessionId),
    });
  }, [queryClient, sessionId]);

  /** Create a fresh goal (new id resets accounting). */
  const createGoal = useCallback(
    async (objective: string, tokenBudget: number | null) => {
      const trimmed = objective.trim();
      if (!trimmed) throw new Error('Goal objective must not be empty');

      const fitted = fitGoalObjective(trimmed);
      const objectiveFile = await writeGoalObjectiveFile(sessionId, fitted);
      const now = Date.now();

      patchAero({
        goal: {
          id: createGoalId(),
          objective: objectiveFile ? '' : fitted,
          objectiveFile,
          status: 'active',
          tokenBudget: normalizeBudget(tokenBudget),
          tokensUsed: 0,
          tokensBaseline: 0,
          tokensCommitted: 0,
          turnsUsed: 0,
          auditFailStreak: 0,
          statusReason: '',
          evaluationProviderID: '',
          evaluationModelID: '',
          lastAccountedMessageID: '',
          createdAt: now,
          updatedAt: now,
        },
      });
      invalidateObjective();
    },
    [sessionId, patchAero, invalidateObjective],
  );

  /**
   * Edit the existing goal in place (id and usage counters preserved) or
   * create one when none exists.
   */
  const saveGoal = useCallback(
    async (objective: string, tokenBudget: number | null) => {
      if (!goal || goal.status === 'complete') {
        await createGoal(objective, tokenBudget);
        return;
      }

      const trimmed = objective.trim();
      if (!trimmed) throw new Error('Goal objective must not be empty');

      const fitted = fitGoalObjective(trimmed);
      const objectiveFile = await writeGoalObjectiveFile(sessionId, fitted);

      patchAero({
        goal: {
          ...goal,
          objective: objectiveFile ? '' : fitted,
          objectiveFile,
          tokenBudget: normalizeBudget(tokenBudget),
          status: 'active',
          statusReason: 'resumed',
          auditFailStreak: 0,
          updatedAt: Date.now(),
        },
      });
      invalidateObjective();
    },
    [goal, sessionId, patchAero, createGoal, invalidateObjective],
  );

  /**
   * Pausing also stops the agent's current turn — the same mental model as the
   * stop button. A no-op when the session is already idle.
   */
  const setStatus = useCallback(
    async (status: 'active' | 'paused' | 'complete') => {
      if (!goal) return;
      if (status === 'paused') {
        void abortSession(sessionId).catch(() => undefined);
      }
      patchAero({
        goal: {
          ...goal,
          status,
          statusReason:
            status === 'active'
              ? 'resumed'
              : status === 'complete'
                ? 'marked by user'
                : '',
          auditFailStreak: 0,
          ...(status === 'active' ? { turnsUsed: 0 } : {}),
          updatedAt: Date.now(),
        },
      });
    },
    [goal, patchAero, abortSession, sessionId],
  );

  /** Remove the goal and its objective file; aborts a running turn. */
  const clearGoal = useCallback(async () => {
    if (!goal) return;
    const wasActive = goal.status === 'active';
    patchAero({ goal: undefined });
    deleteGoalObjectiveFile(sessionId);
    invalidateObjective();
    if (wasActive) {
      void abortSession(sessionId).catch(() => undefined);
    }
  }, [goal, patchAero, sessionId, invalidateObjective, abortSession]);

  return { createGoal, saveGoal, setStatus, clearGoal };
}
