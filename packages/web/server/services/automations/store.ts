// server/services/automations/store.ts
//
// Server-owned persistence for a workspace's automations (scheduled tasks).
// One JSON file per workspace:
//
//   ~/.aero/automations/<workspaceId>.json
//
// `{ tasks: AeroAutomation[] }` is written through a per-workspace in-process
// lock using write-to-temp + rename, so a crash can never leave a half-written
// file and two concurrent writes cannot clobber each other. Runtime state
// (last/next run, status) lives here and is never written into a loop file.

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { AUTOMATIONS_PATH } from '@/server/helper';

import type {
  AeroAutomation,
  AeroAutomationSchedule,
  AeroAutomationState,
  AeroAutomationStatus,
} from '../harness/types';

const WORKSPACE_ID_RE = /^[a-zA-Z0-9._:-]+$/;
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export const MAX_AUTOMATION_NAME_LENGTH = 80;
const MAX_AUTOMATIONS = 200;
const MAX_PROMPT_LENGTH = 100_000;
const MAX_ERROR_LENGTH = 2_000;

const STATUSES: readonly AeroAutomationStatus[] = [
  'idle',
  'running',
  'success',
  'error',
];
const SCHEDULE_KINDS = ['daily', 'weekly', 'once', 'cron'] as const;

function assertValidWorkspaceId(workspaceId: string): void {
  if (!WORKSPACE_ID_RE.test(workspaceId)) {
    throw new Error(`Invalid workspace id: ${workspaceId}`);
  }
}

function automationFile(workspaceId: string): string {
  return join(AUTOMATIONS_PATH, `${workspaceId}.json`);
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clampString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.length > max ? value.slice(0, max) : value;
}

function asNonEmptyString(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function asFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function isValidTimeZone(value: string): boolean {
  try {
    new Intl.DateTimeFormat('en-US', { timeZone: value });
    return true;
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// Sanitization — a malformed entry is dropped, never fatal to the whole read.
// ---------------------------------------------------------------------------

function sanitizeTimes(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  const times = value.filter(
    (candidate): candidate is string =>
      typeof candidate === 'string' && TIME_RE.test(candidate),
  );
  return Array.from(new Set(times)).sort((a, b) => a.localeCompare(b));
}

function sanitizeSchedule(value: unknown): AeroAutomationSchedule | null {
  if (!isObjectRecord(value)) return null;
  const kind = value.kind;
  const timezone =
    typeof value.timezone === 'string' && isValidTimeZone(value.timezone)
      ? value.timezone
      : undefined;

  if (kind === 'daily') {
    const times = sanitizeTimes(value.times);
    return times.length > 0 ? { kind: 'daily', times, timezone } : null;
  }

  if (kind === 'weekly') {
    const times = sanitizeTimes(value.times);
    const weekdays = Array.isArray(value.weekdays)
      ? Array.from(
          new Set(
            value.weekdays.filter(
              (day): day is number =>
                typeof day === 'number' &&
                Number.isInteger(day) &&
                day >= 0 &&
                day <= 6,
            ),
          ),
        ).sort((a, b) => a - b)
      : [];
    if (times.length === 0 || weekdays.length === 0) return null;
    return { kind: 'weekly', weekdays, times, timezone };
  }

  if (kind === 'once') {
    const date = typeof value.date === 'string' ? value.date : '';
    const time = typeof value.time === 'string' ? value.time : '';
    if (!DATE_RE.test(date) || !TIME_RE.test(time)) return null;
    return { kind: 'once', date, time, timezone };
  }

  if (kind === 'cron') {
    const cron = asNonEmptyString(value.cron);
    return cron ? { kind: 'cron', cron, timezone } : null;
  }

  return null;
}

function sanitizeExecution(value: unknown): AeroAutomation['execution'] | null {
  if (!isObjectRecord(value)) return null;
  const prompt = typeof value.prompt === 'string' ? value.prompt : '';
  const providerID = asNonEmptyString(value.providerID);
  const modelID = asNonEmptyString(value.modelID);
  if (!providerID || !modelID) return null;

  const variant = asNonEmptyString(value.variant);
  const agent = asNonEmptyString(value.agent);
  const goalTokenBudget = asFiniteNumber(value.goalTokenBudget);

  return {
    prompt: clampString(prompt, MAX_PROMPT_LENGTH),
    providerID,
    modelID,
    ...(variant ? { variant } : {}),
    ...(agent ? { agent } : {}),
    ...(value.goalEnabled === true ? { goalEnabled: true } : {}),
    ...(goalTokenBudget && goalTokenBudget > 0
      ? { goalTokenBudget: Math.round(goalTokenBudget) }
      : {}),
    ...(value.permissionAutoAccept === true
      ? { permissionAutoAccept: true }
      : {}),
  };
}

function sanitizeState(
  value: unknown,
  fallback: { createdAt: number; updatedAt: number },
): AeroAutomationState {
  const record = isObjectRecord(value) ? value : {};
  const status = STATUSES.includes(record.lastStatus as AeroAutomationStatus)
    ? (record.lastStatus as AeroAutomationStatus)
    : undefined;
  const lastError = asNonEmptyString(record.lastError);

  return {
    createdAt: asFiniteNumber(record.createdAt) ?? fallback.createdAt,
    updatedAt: asFiniteNumber(record.updatedAt) ?? fallback.updatedAt,
    ...(asFiniteNumber(record.lastRunAt) !== undefined
      ? { lastRunAt: asFiniteNumber(record.lastRunAt) }
      : {}),
    ...(asFiniteNumber(record.nextRunAt) !== undefined
      ? { nextRunAt: asFiniteNumber(record.nextRunAt) }
      : {}),
    ...(status ? { lastStatus: status } : {}),
    ...(lastError
      ? { lastError: clampString(lastError, MAX_ERROR_LENGTH) }
      : {}),
    ...(asFiniteNumber(record.lastDurationMs) !== undefined
      ? { lastDurationMs: asFiniteNumber(record.lastDurationMs) }
      : {}),
    ...(asNonEmptyString(record.lastSessionId)
      ? { lastSessionId: asNonEmptyString(record.lastSessionId) as string }
      : {}),
    ...(asFiniteNumber(record.lastScheduledFor) !== undefined
      ? { lastScheduledFor: asFiniteNumber(record.lastScheduledFor) }
      : {}),
  };
}

function sanitizeAutomation(value: unknown): AeroAutomation | null {
  if (!isObjectRecord(value)) return null;
  const id = asNonEmptyString(value.id);
  const name = asNonEmptyString(value.name);
  const schedule = sanitizeSchedule(value.schedule);
  const execution = sanitizeExecution(value.execution);
  if (!id || !name || !schedule || !execution) return null;

  const now = Date.now();
  const loopFile = asNonEmptyString(value.loopFile);

  return {
    id,
    name: clampString(name, MAX_AUTOMATION_NAME_LENGTH),
    enabled: value.enabled === true,
    ...(loopFile ? { loopFile } : {}),
    schedule,
    execution,
    state: sanitizeState(value.state, { createdAt: now, updatedAt: now }),
  };
}

function sanitizeTasks(value: unknown): AeroAutomation[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(sanitizeAutomation)
    .filter((task): task is AeroAutomation => task !== null)
    .slice(0, MAX_AUTOMATIONS);
}

// ---------------------------------------------------------------------------
// Reads / writes
// ---------------------------------------------------------------------------

/** Read the automation list. A missing file is authoritative empty data. */
export async function listAutomations(
  workspaceId: string,
): Promise<AeroAutomation[]> {
  assertValidWorkspaceId(workspaceId);
  try {
    const raw = await readFile(automationFile(workspaceId), 'utf8');
    const parsed: unknown = JSON.parse(raw);
    const tasks = isObjectRecord(parsed) ? parsed.tasks : parsed;
    return sanitizeTasks(tasks);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return [];
    }
    // Unparseable JSON is a failure, not empty data — surface it so callers do
    // not overwrite intact data with an empty list.
    throw error;
  }
}

async function writeAutomations(
  workspaceId: string,
  tasks: AeroAutomation[],
): Promise<void> {
  await mkdir(AUTOMATIONS_PATH, { recursive: true });
  const target = automationFile(workspaceId);
  const temp = `${target}.tmp`;
  await writeFile(temp, `${JSON.stringify({ tasks }, null, 2)}\n`, 'utf8');
  await rename(temp, target);
}

// ---------------------------------------------------------------------------
// Per-workspace write lock
// ---------------------------------------------------------------------------

const locks = new Map<string, Promise<unknown>>();

function withLock<T>(workspaceId: string, task: () => Promise<T>): Promise<T> {
  const previous = locks.get(workspaceId) ?? Promise.resolve();
  const next = previous.then(task, task);
  locks.set(
    workspaceId,
    next.catch(() => {
      //
    }),
  );
  return next;
}

// ---------------------------------------------------------------------------
// Validation for API mutations
// ---------------------------------------------------------------------------

function required<T>(value: T | null | undefined, message: string): T {
  if (value === null || value === undefined) {
    throw new Error(message);
  }
  return value;
}

export interface AutomationInput {
  id?: unknown;
  name?: unknown;
  enabled?: unknown;
  schedule?: unknown;
  execution?: unknown;
}

function validateInput(input: AutomationInput): {
  name: string;
  enabled: boolean;
  schedule: AeroAutomationSchedule;
  execution: AeroAutomation['execution'];
} {
  if (!isObjectRecord(input)) {
    throw new Error('Automation payload is required');
  }

  const name = required(
    asNonEmptyString(input.name),
    'Automation name is required',
  );
  if (name.length > MAX_AUTOMATION_NAME_LENGTH) {
    throw new Error(
      `Automation name must be ${MAX_AUTOMATION_NAME_LENGTH} characters or fewer`,
    );
  }

  const schedule = required(
    sanitizeSchedule(input.schedule),
    'A valid schedule is required',
  );
  const execution = required(
    sanitizeExecution(input.execution),
    'A valid execution (prompt, provider and model) is required',
  );

  return {
    name: clampString(name, MAX_AUTOMATION_NAME_LENGTH),
    enabled: input.enabled === true,
    schedule,
    execution,
  };
}

// ---------------------------------------------------------------------------
// Mutators
// ---------------------------------------------------------------------------

export async function upsertAutomation(
  workspaceId: string,
  input: AutomationInput,
): Promise<{
  task: AeroAutomation;
  tasks: AeroAutomation[];
  created: boolean;
}> {
  assertValidWorkspaceId(workspaceId);
  const validated = validateInput(input);

  return withLock(workspaceId, async () => {
    const tasks = await listAutomations(workspaceId);
    const requestedId = asNonEmptyString(input.id);
    const existing = requestedId
      ? tasks.find((task) => task.id === requestedId)
      : undefined;

    const now = Date.now();

    if (existing) {
      const updated: AeroAutomation = {
        ...existing,
        name: validated.name,
        enabled: validated.enabled,
        schedule: validated.schedule,
        execution: validated.execution,
        state: { ...existing.state, updatedAt: now },
      };
      const next = tasks.map((task) =>
        task.id === updated.id ? updated : task,
      );
      await writeAutomations(workspaceId, next);
      return { task: updated, tasks: next, created: false };
    }

    if (tasks.length >= MAX_AUTOMATIONS) {
      throw new Error(
        `A workspace can hold at most ${MAX_AUTOMATIONS} automations`,
      );
    }

    const created: AeroAutomation = {
      id: randomUUID(),
      name: validated.name,
      enabled: validated.enabled,
      schedule: validated.schedule,
      execution: validated.execution,
      state: { createdAt: now, updatedAt: now },
    };
    const next = [...tasks, created];
    await writeAutomations(workspaceId, next);
    return { task: created, tasks: next, created: true };
  });
}

export async function deleteAutomation(
  workspaceId: string,
  automationId: string,
): Promise<{ deleted: boolean; tasks: AeroAutomation[] }> {
  assertValidWorkspaceId(workspaceId);
  const id = asNonEmptyString(automationId);
  if (!id) throw new Error('Automation id is required');

  return withLock(workspaceId, async () => {
    const tasks = await listAutomations(workspaceId);
    const existing = tasks.find((task) => task.id === id);
    if (!existing) {
      return { deleted: false, tasks };
    }
    if (existing.loopFile) {
      throw new Error(
        'This automation is managed by a .agents/loops markdown file; delete the file to remove it',
      );
    }
    const next = tasks.filter((task) => task.id !== id);
    await writeAutomations(workspaceId, next);
    return { deleted: true, tasks: next };
  });
}

export async function updateAutomationState(
  workspaceId: string,
  automationId: string,
  patch: Partial<AeroAutomationState>,
): Promise<{ task: AeroAutomation | null; tasks: AeroAutomation[] }> {
  assertValidWorkspaceId(workspaceId);
  const id = asNonEmptyString(automationId);
  if (!id) throw new Error('Automation id is required');

  return withLock(workspaceId, async () => {
    const tasks = await listAutomations(workspaceId);
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) {
      return { task: null, tasks };
    }
    const current = tasks[index];
    const updated: AeroAutomation = {
      ...current,
      state: {
        ...current.state,
        ...patch,
        updatedAt: patch.updatedAt ?? Date.now(),
      },
    };
    const next = [...tasks];
    next[index] = updated;
    await writeAutomations(workspaceId, next);
    return { task: updated, tasks: next };
  });
}

/**
 * Conditional state update. The predicate runs inside the workspace lock
 * against the current on-disk task, so an occurrence claim cannot race a
 * second in-process writer. Returns `updated: false` (with the current task)
 * when the predicate rejects.
 */
export async function updateAutomationStateIf(
  workspaceId: string,
  automationId: string,
  predicate: (task: AeroAutomation) => boolean,
  patch: Partial<AeroAutomationState>,
): Promise<{ updated: boolean; task: AeroAutomation | null }> {
  assertValidWorkspaceId(workspaceId);
  const id = asNonEmptyString(automationId);
  if (!id) throw new Error('Automation id is required');

  return withLock(workspaceId, async () => {
    const tasks = await listAutomations(workspaceId);
    const index = tasks.findIndex((task) => task.id === id);
    if (index === -1) {
      return { updated: false, task: null };
    }
    const current = tasks[index];
    if (!predicate(current)) {
      return { updated: false, task: current };
    }
    const updated: AeroAutomation = {
      ...current,
      state: {
        ...current.state,
        ...patch,
        updatedAt: patch.updatedAt ?? Date.now(),
      },
    };
    const next = [...tasks];
    next[index] = updated;
    await writeAutomations(workspaceId, next);
    return { updated: true, task: updated };
  });
}

export { SCHEDULE_KINDS };
