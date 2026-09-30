import { Button, Modal, Spinner, toast } from '@aero/ui';
import {
  CircleCheck,
  CircleExclamation,
  Clock,
  Pencil,
  Play,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';

import { AutomationEditor } from '@/app/features/automations/automation-editor';
import {
  type AutomationDraft,
  useAutomationEvents,
  useAutomations,
  useDeleteAutomation,
  useRunAutomation,
  useUpsertAutomation,
} from '@/app/hooks/api/automations';
import { useWorkspacesCompact } from '@/app/hooks/api/workspaces';
import { useI18n } from '@/app/hooks/i18n';
import type {
  AeroAutomation,
  AeroAutomationStatus,
} from '@/server/services/harness/types';

function formatRelative(target: number): string {
  const diff = target - Date.now();
  const abs = Math.abs(diff);
  const minute = 60_000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const formatter = new Intl.RelativeTimeFormat(undefined, {
    numeric: 'auto',
  });
  if (abs < minute)
    return formatter.format(Math.round(diff / minute), 'minute');
  if (abs < hour) return formatter.format(Math.round(diff / hour), 'hour');
  if (abs < day) return formatter.format(Math.round(diff / day), 'day');
  return formatter.format(Math.round(diff / day), 'day');
}

function formatClock(value: number): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function statusMeta(status: AeroAutomationStatus): {
  labelKey: 'statusIdle' | 'statusRunning' | 'statusSuccess' | 'statusError';
  className: string;
} {
  if (status === 'running')
    return { labelKey: 'statusRunning', className: 'text-warning' };
  if (status === 'success')
    return { labelKey: 'statusSuccess', className: 'text-success' };
  if (status === 'error')
    return { labelKey: 'statusError', className: 'text-danger' };
  return { labelKey: 'statusIdle', className: 'text-muted' };
}

export function AutomationsPage() {
  const { t } = useI18n();
  const navigate = useNavigate();

  const { data: workspaceData } = useWorkspacesCompact();
  const workspaces = useMemo(
    () => workspaceData?.pages.flatMap((page) => page.items) ?? [],
    [workspaceData],
  );

  const [workspaceId, setWorkspaceId] = useState<string>();
  useEffect(() => {
    if (!workspaceId && workspaces[0]) {
      setWorkspaceId(workspaces[0].id);
    }
  }, [workspaceId, workspaces]);

  const workspace = workspaces.find((entry) => entry.id === workspaceId);

  const { data: tasks, isLoading } = useAutomations(workspaceId);
  useAutomationEvents(workspaceId, Boolean(workspaceId));

  const upsert = useUpsertAutomation(workspaceId);
  const remove = useDeleteAutomation(workspaceId);
  const runNow = useRunAutomation(workspaceId);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editing, setEditing] = useState<AeroAutomation | null>(null);
  const [confirming, setConfirming] = useState<AeroAutomation | null>(null);
  const [runningId, setRunningId] = useState<string | null>(null);

  const sorted = useMemo(() => {
    return [...(tasks ?? [])].sort((a, b) => {
      if (a.enabled !== b.enabled) return a.enabled ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
  }, [tasks]);

  const openNew = () => {
    setEditing(null);
    setEditorOpen(true);
  };

  const openEdit = (task: AeroAutomation) => {
    setEditing(task);
    setEditorOpen(true);
  };

  const handleSave = async (draft: AutomationDraft) => {
    try {
      await upsert.mutateAsync(draft);
      toast.success(t.automations.toastSaved);
      setEditorOpen(false);
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t.automations.toastSaveFailed,
      );
      throw error;
    }
  };

  const handleDelete = async (task: AeroAutomation) => {
    try {
      await remove.mutateAsync(task.id);
      toast.success(t.automations.toastDeleted);
    } catch (error) {
      toast.danger(
        error instanceof Error
          ? error.message
          : t.automations.toastDeleteFailed,
      );
    }
  };

  const handleRun = async (task: AeroAutomation) => {
    setRunningId(task.id);
    try {
      const result = await runNow.mutateAsync(task.id);
      toast.success(t.automations.toastStarted);
      if (result.sessionId) {
        void navigate({ to: `/sessions/${result.sessionId}` });
      }
    } catch (error) {
      toast.danger(
        error instanceof Error ? error.message : t.automations.toastRunFailed,
      );
    } finally {
      setRunningId(null);
    }
  };

  const formatSchedule = (task: AeroAutomation): string => {
    const schedule = task.schedule;
    if (schedule.kind === 'daily') {
      return `${t.automations.scheduleDaily} · ${schedule.times.join(', ')}`;
    }
    if (schedule.kind === 'weekly') {
      const labels = t.automations.weekdays;
      const names = [
        labels.sun,
        labels.mon,
        labels.tue,
        labels.wed,
        labels.thu,
        labels.fri,
        labels.sat,
      ];
      const days = schedule.weekdays.map((day) => names[day]).join(', ');
      return `${t.automations.scheduleWeekly} · ${days} · ${schedule.times.join(', ')}`;
    }
    if (schedule.kind === 'once') {
      return `${t.automations.scheduleOnce} · ${schedule.date} ${schedule.time}`;
    }
    return `${t.automations.scheduleCron} · ${schedule.cron}`;
  };

  return (
    <div className='relative h-full overflow-hidden'>
      <div className='flex h-full min-h-0'>
        <aside className='border-border/60 flex w-60 flex-shrink-0 flex-col border-r'>
          <div className='flex flex-1 flex-col gap-0.5 overflow-y-auto p-2'>
            {workspaces.length === 0 ? (
              <p className='text-muted px-2 py-2 text-sm'>
                {t.automations.emptySelectWorkspace}
              </p>
            ) : (
              workspaces.map((entry) => (
                <button
                  key={entry.id}
                  type='button'
                  onClick={() => setWorkspaceId(entry.id)}
                  className={`focus-visible:ring-ring flex w-full min-w-0 items-center rounded-md px-2 py-1.5 text-left text-sm focus-visible:ring-2 focus-visible:outline-none ${
                    workspaceId === entry.id
                      ? 'bg-interactive-selection text-foreground'
                      : 'text-muted hover:bg-interactive-hover/50 hover:text-foreground'
                  }`}
                >
                  <span className='truncate'>
                    {entry.name || entry.directory}
                  </span>
                </button>
              ))
            )}
          </div>
        </aside>

        <main className='flex min-w-0 flex-1 flex-col'>
          <div className='flex items-center justify-between px-6 pt-4 pb-2'>
            <p className='text-muted min-w-0 truncate text-xs'>
              {workspace
                ? workspace.name || workspace.directory
                : t.automations.subtitle}
            </p>
            <Button
              size='sm'
              variant='primary'
              className='gap-1.5'
              isDisabled={!workspaceId}
              onPress={openNew}
            >
              <Icon data={Plus} size={14} />
              {t.automations.newAutomation}
            </Button>
          </div>

          <div className='min-h-0 flex-1 overflow-y-auto px-6 py-4'>
            <div className='mx-auto w-full max-w-3xl'>
              {!workspaceId ? (
                <div className='border-border text-muted rounded-lg border border-dashed p-4 text-sm'>
                  {t.automations.emptySelectWorkspace}
                </div>
              ) : isLoading ? (
                <div className='text-muted flex items-center gap-2 text-sm'>
                  <Spinner size='sm' />
                  {t.automations.loading}
                </div>
              ) : sorted.length === 0 ? (
                <div className='border-border text-muted rounded-lg border border-dashed p-4 text-sm'>
                  {t.automations.emptyNoAutomations}
                </div>
              ) : (
                <div className='flex flex-col gap-2.5'>
                  {sorted.map((task) => {
                    const status = task.state.lastStatus ?? 'idle';
                    const meta = statusMeta(status);
                    const isRunning =
                      runningId === task.id || status === 'running';
                    return (
                      <div
                        key={task.id}
                        className='border-border rounded-lg border p-4'
                      >
                        <div className={task.enabled ? '' : 'opacity-60'}>
                          <div className='text-foreground truncate text-sm font-semibold'>
                            {task.name}
                          </div>
                          <div className='text-muted truncate text-xs'>
                            {formatSchedule(task)}
                          </div>
                        </div>

                        <div className='text-muted mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs'>
                          <span className='inline-flex items-center gap-1.5'>
                            <Icon data={Clock} size={13} />
                            <span className='text-foreground font-medium'>
                              {t.automations.nextRun}
                            </span>
                            {task.state.nextRunAt ? (
                              <span className='text-foreground'>
                                {formatRelative(task.state.nextRunAt)}
                              </span>
                            ) : (
                              <span>—</span>
                            )}
                          </span>
                          <span className='inline-flex items-center gap-1.5'>
                            <span className='text-foreground font-medium'>
                              {t.automations.lastRun}
                            </span>
                            {isRunning ? (
                              <span className='text-warning inline-flex items-center gap-1'>
                                <Spinner size='sm' />
                                {t.automations.runningNow}
                              </span>
                            ) : task.state.lastRunAt ? (
                              <>
                                <span
                                  className={`inline-flex items-center gap-1 ${meta.className}`}
                                >
                                  {status === 'success' ? (
                                    <Icon data={CircleCheck} size={13} />
                                  ) : status === 'error' ? (
                                    <Icon data={CircleExclamation} size={13} />
                                  ) : null}
                                  {t.automations[meta.labelKey]}
                                </span>
                                <span className='text-muted'>
                                  {formatRelative(task.state.lastRunAt)}
                                </span>
                              </>
                            ) : (
                              <span>{t.automations.never}</span>
                            )}
                          </span>
                        </div>

                        {task.state.lastError ? (
                          <div className='border-danger/30 bg-danger-soft text-danger mt-3 rounded-md border p-2 text-xs'>
                            {task.state.lastError}
                          </div>
                        ) : null}

                        <div className='mt-4 flex flex-wrap items-center justify-between gap-2'>
                          <span
                            className={`inline-flex items-center gap-2 text-xs font-medium ${task.enabled ? 'text-foreground' : 'text-muted'}`}
                          >
                            {task.enabled
                              ? t.automations.enabled
                              : t.automations.paused}
                          </span>
                          <div className='flex flex-wrap items-center gap-1.5'>
                            <Button
                              size='sm'
                              variant='outline'
                              isDisabled={isRunning}
                              onPress={() => handleRun(task)}
                            >
                              <Icon data={Play} size={14} />
                              {t.automations.runNow}
                            </Button>
                            <Button
                              size='sm'
                              variant='outline'
                              onPress={() => openEdit(task)}
                            >
                              <Icon data={Pencil} size={14} />
                              {t.automations.edit}
                            </Button>
                            <Button
                              size='sm'
                              variant='danger-soft'
                              isIconOnly
                              aria-label={t.automations.delete}
                              onPress={() => setConfirming(task)}
                            >
                              <Icon data={TrashBin} size={14} />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </main>
      </div>

      <AutomationEditor
        open={editorOpen}
        onOpenChange={setEditorOpen}
        directory={workspace?.directory}
        task={editing}
        saving={upsert.isPending}
        onSave={handleSave}
      />

      <Modal
        isOpen={Boolean(confirming)}
        onOpenChange={(open) => {
          if (!open) setConfirming(null);
        }}
      >
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog className='w-full sm:max-w-[380px]'>
              <Modal.CloseTrigger />
              <Modal.Header>
                <Modal.Heading>{t.automations.delete}</Modal.Heading>
              </Modal.Header>
              <Modal.Body>
                <p className='text-muted text-sm'>
                  {confirming
                    ? t.automations.confirmDelete(confirming.name)
                    : ''}
                </p>
              </Modal.Body>
              <Modal.Footer>
                <Button variant='ghost' size='sm' slot='close'>
                  {t.common.cancel}
                </Button>
                <Button
                  variant='danger'
                  size='sm'
                  slot='close'
                  onPress={() => {
                    if (confirming) void handleDelete(confirming);
                  }}
                >
                  {t.automations.delete}
                </Button>
              </Modal.Footer>
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </div>
  );
}
