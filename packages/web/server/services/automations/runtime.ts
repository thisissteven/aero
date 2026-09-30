// server/services/automations/runtime.ts
//
// In-process scheduler for workspace automations. Computes the next occurrence
// of each task, arms a timer, and on fire creates a session in the workspace
// directory and sends the task's prompt.
//
// Execution waits for the session to go idle (or error) via the shared session
// event hub, so a run's status reflects completion rather than only dispatch.

// `cron-parser` ships as CommonJS with its API assigned onto a function
// export (`module.exports = CronParser`), so Node's ESM named-export detection
// fails. The default export is the module object; destructuring/off it works
// under both Bun and Vite's SSR interop.
import cronParser from 'cron-parser';

import { GET_ALL_LIMIT } from '@/server/helper';
import { getActiveAdapter } from '@/server/services/harness/registry';
import { getSessionEventHub } from '@/server/services/sessions/session-event-hub';
import { expandMessageParts } from '@/server/services/sessions/session-message-part';
import { updateSetting } from '@/server/services/settings';

import type {
  AeroAutomation,
  AeroAutomationSchedule,
  AeroAutomationStatusSummary,
  AeroEvent,
  AeroWorkspaceSummary,
} from '../harness/types';
import {
  listAutomations,
  updateAutomationState,
  updateAutomationStateIf,
  upsertAutomation,
} from './store';

const DEFAULT_GLOBAL_CONCURRENCY = 4;
const DEFAULT_WORKSPACE_CONCURRENCY = 2;
const DEFAULT_MAX_RUN_MS = 30 * 60 * 1000;
const JITTER_MAX_MS = 2_000;
const DUE_SLACK_MS = 5_000;
const MAX_TIMER_DELAY_MS = 2_147_483_647;
const TITLE_MAX_LENGTH = 120;
const HUB_READY_TIMEOUT_MS = 10_000;

// ---------------------------------------------------------------------------
// Time-zone aware next-run computation
// ---------------------------------------------------------------------------

function resolveTimezone(schedule: AeroAutomationSchedule): string {
  const zone = schedule.timezone;
  if (typeof zone === 'string' && zone.trim().length > 0) {
    try {
      new Intl.DateTimeFormat('en-US', { timeZone: zone });
      return zone;
    } catch {
      //
    }
  }
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

interface ZonedParts {
  year: number;
  month: number;
  day: number;
}

function getZonedOffsetMs(utcMs: number, timeZone: string): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(utcMs));

  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;

  const asUTC = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour) % 24,
    Number(map.minute),
    Number(map.second),
  );

  return asUTC - utcMs;
}

function zonedTimeToUtc(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute: number,
  timeZone: string,
): number {
  const guess = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  let ts = guess - getZonedOffsetMs(guess, timeZone);
  // Second pass corrects for a DST transition between the guess and the result.
  ts = guess - getZonedOffsetMs(ts, timeZone);
  return ts;
}

function getZonedDate(utcMs: number, timeZone: string): ZonedParts {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date(utcMs));

  const map: Record<string, string> = {};
  for (const part of parts) map[part.type] = part.value;

  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
  };
}

function addDays(parts: ZonedParts, days: number): ZonedParts {
  const base = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  base.setUTCDate(base.getUTCDate() + days);
  return {
    year: base.getUTCFullYear(),
    month: base.getUTCMonth() + 1,
    day: base.getUTCDate(),
  };
}

function weekdayOf(parts: ZonedParts): number {
  return new Date(Date.UTC(parts.year, parts.month - 1, parts.day)).getUTCDay();
}

function resolveTimes(schedule: AeroAutomationSchedule): string[] {
  if ('times' in schedule && Array.isArray(schedule.times)) {
    return schedule.times
      .filter((time) => /^([01]\d|2[0-3]):([0-5]\d)$/.test(time))
      .sort((a, b) => a.localeCompare(b));
  }
  return [];
}

/**
 * Compute the next fire time for a task, or null when it has no future
 * occurrence (disabled, malformed, or a consumed `once` slot).
 */
export function computeNextRunAt(
  task: AeroAutomation,
  nowMs = Date.now(),
): number | null {
  if (!task?.enabled) return null;
  const schedule = task.schedule;
  if (!schedule || typeof schedule !== 'object') return null;

  const timeZone = resolveTimezone(schedule);
  const minAllowed = nowMs + DUE_SLACK_MS;

  if (schedule.kind === 'daily') {
    const times = resolveTimes(schedule);
    if (times.length === 0) return null;
    const today = getZonedDate(nowMs, timeZone);
    for (const time of times) {
      const [hour, minute] = time.split(':').map(Number);
      const ts = zonedTimeToUtc(
        today.year,
        today.month,
        today.day,
        hour,
        minute,
        timeZone,
      );
      if (ts > minAllowed) return ts;
    }
    const tomorrow = addDays(today, 1);
    const [hour, minute] = times[0].split(':').map(Number);
    return zonedTimeToUtc(
      tomorrow.year,
      tomorrow.month,
      tomorrow.day,
      hour,
      minute,
      timeZone,
    );
  }

  if (schedule.kind === 'weekly') {
    const times = resolveTimes(schedule);
    const weekdays = Array.isArray(schedule.weekdays) ? schedule.weekdays : [];
    if (times.length === 0 || weekdays.length === 0) return null;
    const wanted = new Set(weekdays);
    const today = getZonedDate(nowMs, timeZone);

    for (let offset = 0; offset <= 14; offset += 1) {
      const day = addDays(today, offset);
      if (!wanted.has(weekdayOf(day))) continue;
      for (const time of times) {
        const [hour, minute] = time.split(':').map(Number);
        const ts = zonedTimeToUtc(
          day.year,
          day.month,
          day.day,
          hour,
          minute,
          timeZone,
        );
        if (ts > minAllowed) return ts;
      }
    }
    return null;
  }

  if (schedule.kind === 'once') {
    const [year, month, day] = schedule.date.split('-').map(Number);
    const [hour, minute] = schedule.time.split(':').map(Number);
    const ts = zonedTimeToUtc(year, month, day, hour, minute, timeZone);
    return Number.isFinite(ts) && ts > minAllowed ? ts : null;
  }

  if (schedule.kind === 'cron') {
    try {
      const iterator = cronParser.parseExpression(schedule.cron, {
        tz: timeZone,
        currentDate: new Date(nowMs),
      });
      return iterator.next().getTime();
    } catch {
      return null;
    }
  }

  return null;
}

export function formatAutomationSessionTitle(
  task: AeroAutomation,
  nowMs = Date.now(),
): string {
  const timeZone = resolveTimezone(task.schedule);
  const stamp = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  })
    .format(new Date(nowMs))
    .replace(',', '');

  const name = task.name?.trim() || 'Automation';
  const suffix = ` ${stamp}`;
  const maxNameLength = Math.max(1, TITLE_MAX_LENGTH - suffix.length);
  return `${name.slice(0, maxNameLength)}${suffix}`;
}

// ---------------------------------------------------------------------------
// Events
// ---------------------------------------------------------------------------

export interface AutomationRunEvent {
  type: 'scheduled-task-ran';
  workspaceId: string;
  taskId: string;
  status: 'running' | 'success' | 'error';
  sessionId?: string;
  at: number;
}

type RunEventListener = (event: AutomationRunEvent) => void;

// ---------------------------------------------------------------------------
// Runtime
// ---------------------------------------------------------------------------

interface QueuedRun {
  workspaceId: string;
  taskId: string;
  reason: 'scheduled' | 'manual';
  scheduledFor?: number;
}

function parseCommandPrompt(
  prompt: string,
): { command: string; arguments: string } | null {
  const trimmed = prompt.trim();
  if (!trimmed.startsWith('/')) return null;
  const firstLine = trimmed.split(/\r?\n/, 1)[0] || '';
  const [head, ...tail] = firstLine.split(/\s+/);
  const command = (head || '').slice(1).trim();
  if (!command) return null;
  return { command, arguments: tail.join(' ').trim() };
}

export function createAutomationsRuntime() {
  let started = false;

  const tasksByWorkspace = new Map<string, Map<string, AeroAutomation>>();
  const directoryByWorkspace = new Map<string, string>();
  const timersByKey = new Map<string, ReturnType<typeof setTimeout>>();
  const queuedKeys = new Set<string>();
  const runningKeys = new Set<string>();
  const runningByWorkspace = new Map<string, number>();
  let runningGlobal = 0;
  const queue: QueuedRun[] = [];
  const listeners = new Set<RunEventListener>();

  const keyFor = (workspaceId: string, taskId: string) =>
    `${workspaceId}:${taskId}`;

  const emit = (event: AutomationRunEvent) => {
    for (const listener of listeners) {
      try {
        listener(event);
      } catch {
        //
      }
    }
  };

  const subscribe = (listener: RunEventListener): (() => void) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  };

  const clearTimer = (key: string) => {
    const timer = timersByKey.get(key);
    if (timer) {
      clearTimeout(timer);
      timersByKey.delete(key);
    }
  };

  const clearWorkspaceTimers = (workspaceId: string) => {
    const tasks = tasksByWorkspace.get(workspaceId);
    if (!tasks) return;
    for (const task of tasks.values()) {
      const key = keyFor(workspaceId, task.id);
      clearTimer(key);
      queuedKeys.delete(key);
    }
  };

  const setWorkspaceTasks = (workspaceId: string, tasks: AeroAutomation[]) => {
    clearWorkspaceTimers(workspaceId);
    const map = new Map<string, AeroAutomation>();
    for (const task of tasks) map.set(task.id, task);
    tasksByWorkspace.set(workspaceId, map);
  };

  const updateInMemory = (workspaceId: string, task: AeroAutomation | null) => {
    if (!task) return;
    tasksByWorkspace.get(workspaceId)?.set(task.id, task);
  };

  const scheduleTask = (
    workspaceId: string,
    taskId: string,
    nextRunAt: number,
  ) => {
    const key = keyFor(workspaceId, taskId);
    clearTimer(key);
    if (!started) return;
    if (!Number.isFinite(nextRunAt) || nextRunAt <= 0) return;

    const delayBase = Math.max(0, Math.round(nextRunAt - Date.now()));
    const jitter = Math.floor(Math.random() * (JITTER_MAX_MS + 1));
    const delay = Math.min(delayBase + jitter, MAX_TIMER_DELAY_MS);

    const timer = setTimeout(() => {
      if (delayBase + jitter > MAX_TIMER_DELAY_MS) {
        scheduleTask(workspaceId, taskId, nextRunAt);
        return;
      }
      clearTimer(key);
      const task = tasksByWorkspace.get(workspaceId)?.get(taskId);
      if (!task || !task.enabled) return;
      enqueueRun({
        workspaceId,
        taskId,
        reason: 'scheduled',
        scheduledFor: nextRunAt,
      });
      pumpQueue();
    }, delay);

    timersByKey.set(key, timer);
  };

  const syncTaskSchedule = async (
    workspaceId: string,
    task: AeroAutomation,
  ) => {
    const nextRunAt = computeNextRunAt(task, Date.now());
    const result = await updateAutomationState(workspaceId, task.id, {
      nextRunAt: Number.isFinite(nextRunAt) ? (nextRunAt as number) : undefined,
      updatedAt: Date.now(),
    });
    if (result.task) {
      updateInMemory(workspaceId, result.task);
      if (result.task.enabled && Number.isFinite(result.task.state.nextRunAt)) {
        scheduleTask(
          workspaceId,
          result.task.id,
          result.task.state.nextRunAt as number,
        );
      }
    }
  };

  const ensureWorkspaceDirectory = async (
    workspaceId: string,
  ): Promise<string | null> => {
    const cached = directoryByWorkspace.get(workspaceId);
    if (cached) return cached;
    try {
      const workspaces = await listAllWorkspaces();
      const workspace = workspaces.find((entry) => entry.id === workspaceId);
      if (workspace?.directory) {
        directoryByWorkspace.set(workspaceId, workspace.directory);
        return workspace.directory;
      }
    } catch {
      //
    }
    return null;
  };

  const syncWorkspace = async (
    workspaceId: string,
  ): Promise<AeroAutomation[]> => {
    const tasks = await listAutomations(workspaceId);
    await ensureWorkspaceDirectory(workspaceId);
    setWorkspaceTasks(workspaceId, tasks);
    for (const task of tasks) {
      try {
        await syncTaskSchedule(workspaceId, task);
      } catch {
        //
      }
    }
    return tasks;
  };

  const syncAllWorkspaces = async (): Promise<void> => {
    let workspaces: AeroWorkspaceSummary[] = [];
    try {
      workspaces = await listAllWorkspaces();
    } catch {
      return;
    }

    const activeIds = new Set<string>();
    directoryByWorkspace.clear();
    for (const workspace of workspaces) {
      if (!workspace?.id) continue;
      activeIds.add(workspace.id);
      if (workspace.directory) {
        directoryByWorkspace.set(workspace.id, workspace.directory);
      }
    }

    for (const workspaceId of Array.from(tasksByWorkspace.keys())) {
      if (!activeIds.has(workspaceId)) {
        clearWorkspaceTimers(workspaceId);
        tasksByWorkspace.delete(workspaceId);
      }
    }

    for (const workspaceId of activeIds) {
      try {
        await syncWorkspace(workspaceId);
      } catch {
        // One workspace's file being unusable must not stop the others.
      }
    }
  };

  const enqueueRun = (run: QueuedRun) => {
    const key = keyFor(run.workspaceId, run.taskId);
    if (queuedKeys.has(key) || runningKeys.has(key)) return;
    queuedKeys.add(key);
    queue.push(run);
  };

  const canRun = (workspaceId: string): boolean => {
    if (runningGlobal >= DEFAULT_GLOBAL_CONCURRENCY) return false;
    return (
      (runningByWorkspace.get(workspaceId) || 0) < DEFAULT_WORKSPACE_CONCURRENCY
    );
  };

  const releaseSlot = (workspaceId: string, key: string) => {
    runningKeys.delete(key);
    runningGlobal = Math.max(0, runningGlobal - 1);
    const next = Math.max(0, (runningByWorkspace.get(workspaceId) || 1) - 1);
    if (next === 0) runningByWorkspace.delete(workspaceId);
    else runningByWorkspace.set(workspaceId, next);
  };

  const scheduleFuture = (
    workspaceId: string,
    taskId: string,
    nextRunAt: number | null | undefined,
    fromMs: number,
  ): boolean => {
    if (!Number.isFinite(nextRunAt)) return false;
    if ((nextRunAt as number) <= fromMs) return false;
    scheduleTask(workspaceId, taskId, nextRunAt as number);
    return true;
  };

  const rearm = (
    workspaceId: string,
    taskId: string,
    fallback: AeroAutomation | null,
    fromMs: number,
  ) => {
    const latest = tasksByWorkspace.get(workspaceId)?.get(taskId) || fallback;
    if (!latest?.enabled) return;
    if (scheduleFuture(workspaceId, taskId, latest.state.nextRunAt, fromMs)) {
      return;
    }
    scheduleFuture(
      workspaceId,
      taskId,
      computeNextRunAt(latest, fromMs),
      fromMs,
    );
  };

  const waitForOutcome = async (
    iterator: AsyncIterator<AeroEvent>,
    timeoutMs: number,
  ): Promise<{ status: 'success' } | { status: 'error'; error: string }> => {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
      const remaining = deadline - Date.now();
      const raced = await Promise.race([
        iterator.next(),
        new Promise<{ timeout: true }>((resolve) =>
          setTimeout(() => resolve({ timeout: true }), remaining),
        ),
      ]);

      if ('timeout' in raced) {
        return { status: 'error', error: 'Automation run timed out' };
      }
      if (raced.done) break;

      const event = raced.value;
      if (event.type === 'session.idle') return { status: 'success' };
      if (event.type === 'session.error') {
        return {
          status: 'error',
          error: event.error?.data?.message || 'Session error',
        };
      }
    }
    return { status: 'error', error: 'Automation run timed out' };
  };

  type DispatchResult =
    | {
        ok: true;
        sessionId: string;
        events: AsyncIterator<AeroEvent>;
        startedAt: number;
        directory: string;
      }
    | { ok: false; error: string };

  /**
   * Create the session and send the prompt, returning as soon as the run has
   * been dispatched. Completion is tracked separately so the run API and the
   * queue are never blocked on a long agent turn.
   */
  const dispatchTask = async (
    workspaceId: string,
    task: AeroAutomation,
  ): Promise<DispatchResult> => {
    const directory = directoryByWorkspace.get(workspaceId);
    if (!directory) {
      return { ok: false, error: 'Workspace directory is unavailable' };
    }

    const startedAt = Date.now();
    try {
      const harness = await getActiveAdapter('opencode');

      const session = await harness.createSession({
        title: formatAutomationSessionTitle(task, startedAt),
        directory,
        harnessId: 'opencode',
      });
      const sessionId = session.id;
      if (!sessionId) {
        return { ok: false, error: 'Failed to create session' };
      }

      if (task.execution.permissionAutoAccept) {
        try {
          await updateSetting(
            ['permissionAutoAcceptSessions', sessionId],
            true,
          );
        } catch {
          //
        }
      }
      if (task.execution.goalEnabled) {
        try {
          await updateSetting(['goalMode', sessionId], true);
        } catch {
          //
        }
      }

      const hub = getSessionEventHub('opencode', () =>
        getActiveAdapter('opencode'),
      );
      const events = hub.subscribe(sessionId)[Symbol.asyncIterator]();
      await Promise.race([
        hub.waitUntilReady().catch(() => undefined),
        new Promise((resolve) => setTimeout(resolve, HUB_READY_TIMEOUT_MS)),
      ]);

      const command = parseCommandPrompt(task.execution.prompt);
      if (command) {
        harness.sendCommand(
          sessionId,
          {
            command: command.command,
            arguments: command.arguments,
            agent: task.execution.agent,
            model: `${task.execution.providerID}/${task.execution.modelID}`,
            variant: task.execution.variant,
          },
          directory,
        );
      } else {
        const parts = await expandMessageParts(
          [{ type: 'text', text: task.execution.prompt }],
          directory,
          harness,
        );
        harness.sendMessage(
          sessionId,
          {
            parts,
            model: {
              providerId: task.execution.providerID,
              modelId: task.execution.modelID,
            },
            agent: task.execution.agent,
            variant: task.execution.variant,
          },
          directory,
        );
      }

      return { ok: true, sessionId, events, startedAt, directory };
    } catch (error) {
      return {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  };

  /**
   * Persist the terminal state of a run, consume a `once` task, and arm the
   * next occurrence. Safe to call from a background task.
   */
  const finalizeRun = async (
    workspaceId: string,
    taskId: string,
    task: AeroAutomation,
    reason: 'scheduled' | 'manual',
    outcome: {
      status: 'success' | 'error';
      error?: string;
      sessionId?: string;
      startedAt: number;
    },
  ) => {
    const finishedAt = Date.now();
    const durationMs = Math.max(0, finishedAt - outcome.startedAt);

    let latest = tasksByWorkspace.get(workspaceId)?.get(taskId) || task;

    if (
      latest.schedule.kind === 'once' &&
      reason === 'scheduled' &&
      latest.enabled
    ) {
      try {
        const consumed = await upsertAutomation(workspaceId, {
          ...latest,
          enabled: false,
        });
        latest = consumed.task;
        updateInMemory(workspaceId, latest);
      } catch {
        //
      }
    }

    const nextRunAt = computeNextRunAt(latest, finishedAt);

    const stateResult = await updateAutomationState(workspaceId, taskId, {
      lastStatus: outcome.status,
      lastDurationMs: durationMs,
      lastError: outcome.status === 'error' ? outcome.error : undefined,
      lastSessionId:
        outcome.status === 'success' ? outcome.sessionId : undefined,
      nextRunAt: Number.isFinite(nextRunAt) ? (nextRunAt as number) : undefined,
      updatedAt: finishedAt,
    });
    updateInMemory(workspaceId, stateResult.task);

    const persisted = stateResult.task || latest;
    if (persisted.enabled) {
      if (
        !scheduleFuture(
          workspaceId,
          taskId,
          persisted.state.nextRunAt,
          finishedAt,
        )
      ) {
        rearm(workspaceId, taskId, persisted, finishedAt);
      }
    }

    emit({
      type: 'scheduled-task-ran',
      workspaceId,
      taskId,
      status: outcome.status,
      ...(outcome.sessionId ? { sessionId: outcome.sessionId } : {}),
      at: finishedAt,
    });
  };

  const runTask = async (
    workspaceId: string,
    taskId: string,
    reason: 'scheduled' | 'manual',
    scheduledFor?: number,
  ): Promise<{
    ok: boolean;
    skipped?: boolean;
    running?: boolean;
    status?: 'running' | 'success' | 'error';
    sessionID?: string;
    error?: string;
    reason?: string;
  }> => {
    const task = tasksByWorkspace.get(workspaceId)?.get(taskId);
    if (!task || (reason !== 'manual' && !task.enabled)) {
      return { ok: false, skipped: true };
    }

    const key = keyFor(workspaceId, taskId);
    if (runningKeys.has(key)) {
      return {
        ok: false,
        running: true,
        error: 'Automation is already running',
      };
    }

    runningKeys.add(key);
    runningGlobal += 1;
    runningByWorkspace.set(
      workspaceId,
      (runningByWorkspace.get(workspaceId) || 0) + 1,
    );

    // When a run is dispatched, completion (and slot release) is handed to a
    // background task; the slot is only released here for early failures.
    let handedOff = false;

    try {
      const startAt = Date.now();

      if (reason === 'scheduled') {
        if (!Number.isFinite(scheduledFor)) {
          return { ok: false, skipped: true, reason: 'missing-scheduled-for' };
        }

        const nextAfterClaim = computeNextRunAt(
          task,
          Math.max(startAt, (scheduledFor as number) + 1),
        );

        const claim = await updateAutomationStateIf(
          workspaceId,
          taskId,
          (candidate) => {
            if (!candidate.enabled) return false;
            const lastScheduledFor = candidate.state.lastScheduledFor;
            if (
              Number.isFinite(lastScheduledFor) &&
              Math.abs(
                (lastScheduledFor as number) - (scheduledFor as number),
              ) <= DUE_SLACK_MS
            ) {
              return false;
            }
            return true;
          },
          {
            lastScheduledFor: Math.round(scheduledFor as number),
            lastRunAt: startAt,
            lastStatus: 'running',
            lastError: undefined,
            updatedAt: startAt,
            nextRunAt: Number.isFinite(nextAfterClaim)
              ? (nextAfterClaim as number)
              : undefined,
          },
        );

        if (!claim.updated) {
          updateInMemory(workspaceId, claim.task);
          rearm(
            workspaceId,
            taskId,
            claim.task,
            Math.max(Date.now(), (scheduledFor as number) + 1),
          );
          return { ok: false, skipped: true, reason: 'occurrence-claimed' };
        }
        updateInMemory(workspaceId, claim.task);
      } else {
        const start = await updateAutomationState(workspaceId, taskId, {
          lastRunAt: startAt,
          lastStatus: 'running',
          lastError: undefined,
          updatedAt: startAt,
        });
        updateInMemory(workspaceId, start.task);
      }

      emit({
        type: 'scheduled-task-ran',
        workspaceId,
        taskId,
        status: 'running',
        at: startAt,
      });

      const dispatch = await dispatchTask(workspaceId, task);

      if (!dispatch.ok) {
        try {
          await finalizeRun(workspaceId, taskId, task, reason, {
            status: 'error',
            error: dispatch.error,
            startedAt: startAt,
          });
        } catch {
          //
        }
        return { ok: false, status: 'error', error: dispatch.error };
      }

      handedOff = true;
      const { sessionId, events, startedAt } = dispatch;

      void (async () => {
        let outcome: { status: 'success' } | { status: 'error'; error: string };
        try {
          outcome = await waitForOutcome(events, DEFAULT_MAX_RUN_MS);
        } catch (error) {
          outcome = {
            status: 'error',
            error: error instanceof Error ? error.message : String(error),
          };
        } finally {
          try {
            await events.return?.();
          } catch {
            //
          }
        }

        try {
          await finalizeRun(workspaceId, taskId, task, reason, {
            status: outcome.status,
            ...(outcome.status === 'error' ? { error: outcome.error } : {}),
            sessionId,
            startedAt,
          });
        } catch {
          //
        } finally {
          releaseSlot(workspaceId, key);
        }
      })();

      return { ok: true, status: 'running', sessionID: sessionId };
    } finally {
      if (!handedOff) releaseSlot(workspaceId, key);
    }
  };

  const pumpQueue = () => {
    if (!started) return;
    for (let index = 0; index < queue.length; index += 1) {
      const item = queue[index];
      if (!canRun(item.workspaceId)) continue;

      queue.splice(index, 1);
      index -= 1;
      queuedKeys.delete(keyFor(item.workspaceId, item.taskId));

      void runTask(
        item.workspaceId,
        item.taskId,
        item.reason,
        item.scheduledFor,
      )
        .catch(() => {
          //
        })
        .finally(() => pumpQueue());
    }
  };

  const runNow = async (
    workspaceId: string,
    taskId: string,
    scheduledFor?: number,
  ) => {
    const key = keyFor(workspaceId, taskId);
    if (runningKeys.has(key)) {
      return {
        ok: false,
        running: true,
        error: 'Automation is already running',
      };
    }
    if (queuedKeys.has(key)) {
      return {
        ok: false,
        running: true,
        error: 'Automation is already queued',
      };
    }
    // Make sure the task is loaded in memory before a manual run.
    if (!tasksByWorkspace.get(workspaceId)?.has(taskId)) {
      await syncWorkspace(workspaceId);
    }
    return runTask(workspaceId, taskId, 'manual', scheduledFor);
  };

  const start = async () => {
    if (started) return;
    started = true;
    await syncAllWorkspaces();
  };

  const stop = () => {
    if (!started) return;
    started = false;
    for (const timer of timersByKey.values()) clearTimeout(timer);
    timersByKey.clear();
    queuedKeys.clear();
    queue.length = 0;
  };

  const getStatus = (): AeroAutomationStatusSummary => {
    let enabled = 0;
    for (const tasks of tasksByWorkspace.values()) {
      for (const task of tasks.values()) {
        if (task.enabled) enabled += 1;
      }
    }
    const running = runningKeys.size;
    return {
      hasEnabledAutomations: enabled > 0,
      hasRunningAutomations: running > 0,
      enabledAutomationsCount: enabled,
      runningAutomationsCount: running,
    };
  };

  return {
    start,
    stop,
    syncAllWorkspaces,
    syncWorkspace,
    runNow,
    getStatus,
    subscribe,
  };
}

async function listAllWorkspaces(): Promise<AeroWorkspaceSummary[]> {
  const adapter = await getActiveAdapter();
  const result = await adapter.listWorkspaces({ limit: GET_ALL_LIMIT });
  return result.items;
}

const globalKey = '__aero_automations_runtime__';

const globalScope = globalThis as typeof globalThis & {
  [globalKey]?: ReturnType<typeof createAutomationsRuntime>;
};

export const automationsRuntime =
  globalScope[globalKey] ??
  (globalScope[globalKey] = createAutomationsRuntime());
