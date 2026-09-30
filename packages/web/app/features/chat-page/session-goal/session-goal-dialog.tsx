'use client';

import { Button, Checkbox, Input, Modal, TextArea, toast } from '@aero/ui';
import React from 'react';

import {
  formatGoalTokens,
  SESSION_GOAL_OBJECTIVE_CHAR_LIMIT,
  sessionGoalStatusColor,
} from '@/app/features/chat-page/session-goal/goal-utils';
import { useGoalObjectiveContent } from '@/app/hooks/api/goals';
import { useGoalActions, useSessionGoal } from '@/app/hooks/api/session-goal';
import { useI18n } from '@/app/hooks/i18n';

interface SessionGoalDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionId: string;
}

// Create/manage dialog for the session goal: objective + optional token budget
// on creation; status, usage and lifecycle actions (pause/resume/complete/
// clear) once a goal exists.
export function SessionGoalDialog({
  open,
  onOpenChange,
  sessionId,
}: SessionGoalDialogProps) {
  const { t } = useI18n();
  const { goal } = useSessionGoal(sessionId);
  const objectiveQuery = useGoalObjectiveContent(
    sessionId,
    Boolean(open && goal?.objectiveFile),
  );
  const objectiveContent = objectiveQuery.data ?? null;
  const { saveGoal, setStatus, clearGoal } = useGoalActions(sessionId, goal);

  const [objective, setObjective] = React.useState('');
  const [budgetEnabled, setBudgetEnabled] = React.useState(false);
  const [tokenBudget, setTokenBudget] = React.useState(200_000);
  const [busy, setBusy] = React.useState(false);

  React.useEffect(() => {
    if (!open) return;
    setObjective(
      goal?.objectiveFile ? (objectiveContent ?? '') : (goal?.objective ?? ''),
    );
    setBudgetEnabled(Boolean(goal?.tokenBudget));
    setTokenBudget(goal?.tokenBudget ?? 200_000);
    // Seed the form only when the dialog opens; live updates while open must
    // not clobber the user's edits.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  React.useEffect(() => {
    if (!open || !goal?.objectiveFile || objectiveContent === null) return;
    setObjective((current) => (current === '' ? objectiveContent : current));
  }, [open, goal?.objectiveFile, objectiveContent]);

  const run = React.useCallback(
    async (action: () => Promise<void>, closeAfter: boolean) => {
      setBusy(true);
      try {
        await action();
        if (closeAfter) onOpenChange(false);
      } catch {
        toast.danger(t.sessionGoal.toast.actionFailed);
      } finally {
        setBusy(false);
      }
    },
    [onOpenChange, t],
  );

  const isCompleted = goal?.status === 'complete';
  const savedObjective = goal?.objectiveFile
    ? (objectiveContent ?? '')
    : (goal?.objective ?? '');
  const objectiveChanged = objective.trim() !== savedObjective;
  const budgetValue = budgetEnabled ? tokenBudget : null;
  const budgetChanged = budgetValue !== (goal?.tokenBudget ?? null);
  const canSave =
    !isCompleted &&
    objective.trim().length > 0 &&
    (!goal || objectiveChanged || budgetChanged);

  const title = goal
    ? t.sessionGoal.dialog.titleManage
    : t.sessionGoal.dialog.titleCreate;

  const usage = goal?.tokenBudget
    ? t.sessionGoal.usage.tokensWithBudget(
        formatGoalTokens(goal.tokensUsed),
        formatGoalTokens(goal.tokenBudget),
      )
    : t.sessionGoal.usage.tokens(formatGoalTokens(goal?.tokensUsed ?? 0));

  const canResume =
    goal?.status === 'paused' ||
    goal?.status === 'blocked' ||
    goal?.status === 'budgetLimited';

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className='sm:max-w-[520px]'>
            <Modal.Header>
              <Modal.Heading>{title}</Modal.Heading>
              <Modal.CloseTrigger />
            </Modal.Header>

            <Modal.Body className='space-y-3'>
              {goal ? (
                <div className='space-y-1 rounded-lg p-2'>
                  <div className='flex items-center gap-2'>
                    <span
                      className='h-2 w-2 flex-shrink-0 rounded-full'
                      style={{
                        backgroundColor: sessionGoalStatusColor[goal.status],
                      }}
                      aria-hidden='true'
                    />
                    <span className='text-foreground text-sm font-medium'>
                      {t.sessionGoal.status[goal.status]}
                    </span>
                    <span className='text-muted text-xs tabular-nums'>
                      {usage} · {t.sessionGoal.usage.turns(goal.turnsUsed)}
                    </span>
                  </div>

                  {goal.statusReason &&
                  (goal.status === 'blocked' ||
                    goal.status === 'budgetLimited') ? (
                    <p className='text-muted text-xs'>{goal.statusReason}</p>
                  ) : null}

                  {goal.evaluationProviderID || goal.evaluationModelID ? (
                    <div className='flex items-baseline gap-2 text-xs'>
                      <span className='text-muted'>
                        {t.sessionGoal.dialog.evaluationModelLabel}
                      </span>
                      <span className='text-foreground min-w-0 break-all'>
                        {[goal.evaluationProviderID, goal.evaluationModelID]
                          .filter(Boolean)
                          .join('/')}
                      </span>
                    </div>
                  ) : null}

                  <div className='flex flex-wrap gap-2 pt-1'>
                    {goal.status === 'active' ? (
                      <Button
                        size='sm'
                        variant='outline'
                        isDisabled={busy}
                        onPress={() =>
                          void run(() => setStatus('paused'), false)
                        }
                      >
                        {t.sessionGoal.action.pause}
                      </Button>
                    ) : null}
                    {canResume ? (
                      <Button
                        size='sm'
                        variant='outline'
                        isDisabled={busy}
                        onPress={() =>
                          void run(() => setStatus('active'), false)
                        }
                      >
                        {t.sessionGoal.action.resume}
                      </Button>
                    ) : null}
                  </div>
                </div>
              ) : null}

              {isCompleted ? (
                <p className='text-muted max-h-48 overflow-y-auto text-xs whitespace-pre-wrap'>
                  {objectiveContent ?? goal?.objective}
                </p>
              ) : (
                <>
                  <div className='space-y-1'>
                    <div className='flex items-baseline justify-between gap-2'>
                      <span className='text-foreground text-sm font-medium'>
                        {t.sessionGoal.dialog.objectiveLabel}
                      </span>
                      <span className='text-muted text-xs tabular-nums'>
                        {objective.length}/{SESSION_GOAL_OBJECTIVE_CHAR_LIMIT}
                      </span>
                    </div>
                    <TextArea
                      value={objective}
                      onChange={(event) => setObjective(event.target.value)}
                      placeholder={t.sessionGoal.dialog.objectivePlaceholder}
                      maxLength={SESSION_GOAL_OBJECTIVE_CHAR_LIMIT}
                      rows={4}
                      className='min-h-24 w-full resize-none scrollbar-thin'
                    />
                  </div>

                  <div className='flex items-center gap-4'>
                    <Checkbox
                      isSelected={budgetEnabled}
                      onChange={setBudgetEnabled}
                    >
                      <Checkbox.Content>
                        <Checkbox.Control>
                          <Checkbox.Indicator />
                        </Checkbox.Control>
                        {t.sessionGoal.dialog.budgetLabel}
                      </Checkbox.Content>
                    </Checkbox>
                    {budgetEnabled ? (
                      <Input
                        type='number'
                        min={1000}
                        step={50_000}
                        value={String(tokenBudget)}
                        onChange={(event) =>
                          setTokenBudget(
                            Math.max(
                              1000,
                              Math.floor(Number(event.target.value)) || 1000,
                            ),
                          )
                        }
                        className='w-40'
                        aria-label={t.sessionGoal.dialog.budgetLabel}
                      />
                    ) : null}
                  </div>
                </>
              )}
            </Modal.Body>

            <Modal.Footer className='flex items-center gap-2'>
              {goal ? (
                <Button
                  size='sm'
                  variant='ghost'
                  isDisabled={busy}
                  onPress={() => void run(() => clearGoal(), true)}
                >
                  {t.sessionGoal.action.clear}
                </Button>
              ) : null}
              <div className='flex flex-1 items-center justify-end gap-2'>
                <Button
                  size='sm'
                  variant='ghost'
                  isDisabled={busy}
                  onPress={() => onOpenChange(false)}
                >
                  {t.sessionGoal.action.cancel}
                </Button>
                {!isCompleted ? (
                  <Button
                    size='sm'
                    variant='primary'
                    isDisabled={busy || !canSave}
                    onPress={() =>
                      void run(
                        () => saveGoal(objective.trim(), budgetValue),
                        true,
                      )
                    }
                  >
                    {goal
                      ? t.sessionGoal.action.save
                      : t.sessionGoal.action.start}
                  </Button>
                ) : null}
              </div>
            </Modal.Footer>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
