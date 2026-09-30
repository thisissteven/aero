'use client';

import { cn, toast } from '@aero/ui';
import { Target } from '@gravity-ui/icons';
import React from 'react';

import {
  formatGoalTokens,
  sessionGoalStatusColor,
} from '@/app/features/chat-page/session-goal/goal-utils';
import { useGoalObjectiveContent } from '@/app/hooks/api/goals';
import { useGoalActions, useSessionGoal } from '@/app/hooks/api/session-goal';
import { useSessionStatus } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';

interface SessionGoalRowProps {
  sessionId: string;
  className?: string;
}

// Compact goal strip near the composer: status dot, objective, token usage and
// an inline pause/resume action. The manage dialog opens from the composer
// target button, not from here.
export const SessionGoalRow = React.memo(function SessionGoalRow({
  sessionId,
  className,
}: SessionGoalRowProps) {
  const { t } = useI18n();
  const { goal, enabled } = useSessionGoal(sessionId);
  const { data: statuses } = useSessionStatus(undefined, sessionId);
  const { setStatus } = useGoalActions(sessionId, goal);
  const { data: objectiveContent } = useGoalObjectiveContent(
    sessionId,
    Boolean(goal?.objectiveFile),
  );
  const [busy, setBusy] = React.useState(false);

  const handleToggleStatus = React.useCallback(
    async (next: 'active' | 'paused') => {
      if (!sessionId || busy) return;
      setBusy(true);
      try {
        await setStatus(next);
      } catch {
        toast.danger(t.sessionGoal.toast.actionFailed);
      } finally {
        setBusy(false);
      }
    },
    [sessionId, busy, setStatus, t],
  );

  if (!sessionId || !enabled || !goal) return null;

  const sessionStatus = statuses?.[sessionId] as { type?: string } | undefined;
  const isWorking = Boolean(sessionStatus) && sessionStatus?.type !== 'idle';

  // Accounting only lands on idle ticks — hide the counter until there is a
  // real number (or a budget worth tracking against).
  const usage = goal.tokenBudget
    ? t.sessionGoal.usage.tokensWithBudget(
        formatGoalTokens(goal.tokensUsed),
        formatGoalTokens(goal.tokenBudget),
      )
    : goal.tokensUsed > 0
      ? t.sessionGoal.usage.tokens(formatGoalTokens(goal.tokensUsed))
      : null;

  const pauseResume =
    goal.status === 'active'
      ? {
          labelKey: 'pause' as const,
          next: 'paused' as const,
        }
      : goal.status === 'paused' ||
          goal.status === 'blocked' ||
          goal.status === 'budgetLimited'
        ? {
            labelKey: 'resume' as const,
            next: 'active' as const,
          }
        : null;

  const objectText = goal.objectiveFile
    ? (objectiveContent ?? t.sessionGoal.dialog.titleManage)
    : goal.objective;

  return (
    <div
      className={cn(
        'mx-2 mb-2 flex w-auto min-w-0 items-center gap-2 rounded-lg border px-2 py-1',
        'border-separator bg-surface',
        className,
      )}
      aria-label={t.sessionGoal.row.aria}
      title={objectText}
    >
      <Target
        className='h-3.5 w-3.5 flex-shrink-0'
        style={{ color: sessionGoalStatusColor[goal.status] }}
        aria-hidden='true'
      />
      <span className='text-foreground min-w-0 flex-1 truncate text-xs'>
        {objectText}
      </span>

      {goal.status === 'active' && !isWorking ? (
        // The agent stopped but the goal is still active: the server is sitting
        // out the quiet window and running the audit.
        <span className='text-muted flex-shrink-0 text-xs'>
          {t.sessionGoal.row.evaluating}
        </span>
      ) : (
        <span className='text-muted flex-shrink-0 text-xs'>
          {t.sessionGoal.status[goal.status]}
        </span>
      )}

      {usage ? (
        <span className='text-muted flex-shrink-0 text-xs tabular-nums'>
          {usage}
        </span>
      ) : null}

      {pauseResume ? (
        <button
          type='button'
          onClick={() => void handleToggleStatus(pauseResume.next)}
          disabled={busy}
          className='text-muted hover:text-foreground flex flex-shrink-0 cursor-pointer items-center rounded px-1 py-0.5 text-xs disabled:opacity-50'
        >
          {t.sessionGoal.action[pauseResume.labelKey]}
        </button>
      ) : null}
    </div>
  );
});
