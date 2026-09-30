import { cn, ToggleButton, Tooltip } from '@aero/ui';
import { Target } from '@gravity-ui/icons';
import { useState } from 'react';

import { sessionGoalStatusColor } from '@/app/features/chat-page/session-goal/goal-utils';
import { SessionGoalDialog } from '@/app/features/chat-page/session-goal/session-goal-dialog';
import {
  useSessionGoal,
  useSessionGoalEnabled,
} from '@/app/hooks/api/session-goal';
import { useGoalMode, useUpdateSetting } from '@/app/hooks/api/settings';
import { useI18n } from '@/app/hooks/i18n';

/**
 * Composer target button — the goal switch. With no live goal one tap arms
 * goal mode (the next sent prompt becomes the objective); while a goal is live
 * the target stays lit with its status color and tapping opens the manage
 * dialog.
 */
export function GoalModeToggleButton({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();
  const { goal } = useSessionGoal(sessionId);
  const enabled = useSessionGoalEnabled();
  const { data: armedData } = useGoalMode(sessionId);
  const { mutate: updateSetting } = useUpdateSetting();
  const [dialogOpen, setDialogOpen] = useState(false);

  const armed = armedData?.value ?? false;

  if (!enabled || !sessionId) {
    return null;
  }

  const iconColor = goal
    ? sessionGoalStatusColor[goal.status]
    : armed
      ? 'var(--accent)'
      : undefined;

  const label = goal
    ? t.sessionGoal.button.manageAria
    : armed
      ? t.sessionGoal.button.disarmAria
      : t.sessionGoal.button.armAria;

  const handlePress = () => {
    if (goal) {
      setDialogOpen(true);
      return;
    }
    updateSetting({ path: ['goalMode', sessionId], value: !armed });
  };

  return (
    <>
      <Tooltip>
        <Tooltip.Trigger>
          <ToggleButton
            isIconOnly
            aria-label={label}
            variant='ghost'
            size='sm'
            className={cn('rounded-lg')}
            style={iconColor ? { color: iconColor } : undefined}
            isSelected={Boolean(goal) || armed}
            onPress={handlePress}
          >
            <Target />
          </ToggleButton>
        </Tooltip.Trigger>
        <Tooltip.Content>{label}</Tooltip.Content>
      </Tooltip>

      <SessionGoalDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        sessionId={sessionId}
      />
    </>
  );
}
