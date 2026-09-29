// server/services/project-context.ts
//
// Server-owned storage for a workspace's scratch space: free-form notes, a
// todo list, and saved plan documents. Sits beside the workspace metadata, not
// inside the repo, so it belongs to the project across every session and
// worktree. Files live at:
//
//   ~/.aero/project-context/<workspaceId>/context.json
//   ~/.aero/project-context/<workspaceId>/plans/<file>.md
//
// `context.json` is written through a per-workspace in-process lock using
// write-to-temp + rename, so a crash can never leave a half-written file and
// two concurrent writes cannot clobber each other.

import { randomUUID } from 'node:crypto';
import {
  mkdir,
  readdir,
  readFile,
  rename,
  rm,
  writeFile,
} from 'node:fs/promises';
import { join } from 'node:path';

import { PROJECT_CONTEXT_PATH } from '@/server/helper';

import type {
  AeroComposerSegment,
  AeroComposerTokenType,
  AeroProjectContext,
  AeroProjectNote,
  AeroProjectPlan,
  AeroProjectPlanContent,
  AeroProjectQueueMessage,
  AeroProjectTodo,
  AeroProjectTodoPriority,
  AeroProjectTodoStatus,
} from './harness/types';

const WORKSPACE_ID_RE = /^[a-zA-Z0-9._:-]+$/;

const TODO_STATUSES: readonly AeroProjectTodoStatus[] = [
  'backlog',
  'active',
  'done',
];
const TODO_PRIORITIES: readonly AeroProjectTodoPriority[] = [
  'low',
  'medium',
  'high',
];
const DEFAULT_TODO_PRIORITY: AeroProjectTodoPriority = 'medium';

const COMPOSER_TOKEN_TYPES: readonly AeroComposerTokenType[] = [
  'agent',
  'command',
  'file',
  'skill',
  'snippet',
];
const COMPOSER_TOKEN_TRIGGERS = ['@', '/', '#'] as const;

const MAX_NOTES = 100;
const MAX_NOTE_TITLE = 200;
const MAX_NOTE_BODY = 100_000;
const MAX_TODOS = 500;
const MAX_QUEUE = 200;
const MAX_PLANS = 200;
const MAX_TODO_TEXT_LENGTH = 2_000;
const MAX_COMPOSER_SEGMENTS = 200;
const MAX_PLAN_BYTES = 1_000_000;

const EMPTY_CONTEXT: AeroProjectContext = {
  notes: [],
  todos: [],
  queue: [],
  plans: [],
};

function assertValidWorkspaceId(workspaceId: string): void {
  if (!WORKSPACE_ID_RE.test(workspaceId)) {
    throw new Error(`Invalid workspace id: ${workspaceId}`);
  }
}

function contextDir(workspaceId: string): string {
  return join(PROJECT_CONTEXT_PATH, workspaceId);
}

function contextFile(workspaceId: string): string {
  return join(contextDir(workspaceId), 'context.json');
}

function plansDir(workspaceId: string): string {
  return join(contextDir(workspaceId), 'plans');
}

function isObjectRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function clampString(value: unknown, max: number): string {
  if (typeof value !== 'string') return '';
  return value.length > max ? value.slice(0, max) : value;
}

// ---------------------------------------------------------------------------
// Sanitization — a malformed entry is dropped, never fatal to the whole read.
// ---------------------------------------------------------------------------

function emptySegments(text: string): AeroComposerSegment[] {
  return text ? [{ type: 'text', text }] : [];
}

function textFromSegments(segments: AeroComposerSegment[]): string {
  return segments
    .map((segment) =>
      segment.type === 'text'
        ? segment.text
        : segment.token.label || segment.token.value,
    )
    .join('')
    .trim();
}

function sanitizeComposerSegment(value: unknown): AeroComposerSegment | null {
  if (!isObjectRecord(value)) return null;

  if (value.type === 'text') {
    if (typeof value.text !== 'string') return null;
    return {
      type: 'text',
      text: clampString(value.text, MAX_TODO_TEXT_LENGTH),
    };
  }

  if (value.type === 'token' && isObjectRecord(value.token)) {
    const token = value.token;
    if (typeof token.id !== 'string' || !token.id) return null;

    const type = COMPOSER_TOKEN_TYPES.includes(
      token.type as AeroComposerTokenType,
    )
      ? (token.type as AeroComposerTokenType)
      : 'snippet';
    const trigger = (COMPOSER_TOKEN_TRIGGERS as readonly string[]).includes(
      token.trigger as string,
    )
      ? (token.trigger as (typeof COMPOSER_TOKEN_TRIGGERS)[number])
      : '@';

    return {
      type: 'token',
      token: {
        id: token.id,
        type,
        label: clampString(token.label, 500),
        value: clampString(token.value, 1_000),
        trigger,
      },
    };
  }

  return null;
}

function sanitizeComposerSegments(value: unknown): AeroComposerSegment[] {
  if (!Array.isArray(value)) return [];
  return value
    .map(sanitizeComposerSegment)
    .filter((segment): segment is AeroComposerSegment => segment !== null)
    .slice(0, MAX_COMPOSER_SEGMENTS);
}

function sanitizeTodo(value: unknown): AeroProjectTodo | null {
  if (!isObjectRecord(value)) return null;
  if (typeof value.id !== 'string' || !value.id) return null;
  if (typeof value.text !== 'string') return null;

  // Status and priority were added after the first release. A missing status
  // falls back to the legacy `completed` flag so existing scratch space reads
  // back as a done/backlog task instead of being dropped.
  const status = TODO_STATUSES.includes(value.status as AeroProjectTodoStatus)
    ? (value.status as AeroProjectTodoStatus)
    : value.completed === true
      ? 'done'
      : 'backlog';
  const priority = TODO_PRIORITIES.includes(
    value.priority as AeroProjectTodoPriority,
  )
    ? (value.priority as AeroProjectTodoPriority)
    : DEFAULT_TODO_PRIORITY;

  return {
    id: value.id,
    text: clampString(value.text, MAX_TODO_TEXT_LENGTH),
    status,
    priority,
    createdAt:
      typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
        ? value.createdAt
        : Date.now(),
  };
}

function sanitizeQueueMessage(value: unknown): AeroProjectQueueMessage | null {
  if (!isObjectRecord(value)) return null;
  if (typeof value.id !== 'string' || !value.id) return null;

  let segments = sanitizeComposerSegments(value.segments);
  if (segments.length === 0 && typeof value.text === 'string' && value.text) {
    segments = emptySegments(clampString(value.text, MAX_TODO_TEXT_LENGTH));
  }
  if (segments.length === 0) return null;

  const text =
    typeof value.text === 'string' && value.text
      ? clampString(value.text, MAX_TODO_TEXT_LENGTH)
      : textFromSegments(segments);

  return {
    id: value.id,
    text,
    segments,
    createdAt:
      typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
        ? value.createdAt
        : Date.now(),
  };
}

function sanitizeNote(value: unknown): AeroProjectNote | null {
  if (!isObjectRecord(value)) return null;
  if (typeof value.id !== 'string' || !value.id) return null;

  const createdAt =
    typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
      ? value.createdAt
      : Date.now();

  return {
    id: value.id,
    title: clampString(value.title, MAX_NOTE_TITLE),
    body: clampString(value.body, MAX_NOTE_BODY),
    createdAt,
    updatedAt:
      typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : createdAt,
  };
}

function sanitizePlan(value: unknown): AeroProjectPlan | null {
  if (!isObjectRecord(value)) return null;
  if (typeof value.id !== 'string' || !value.id) return null;
  if (typeof value.file !== 'string' || !value.file) return null;

  // The manifest only ever stores a base name. Reject anything that could
  // escape the plans directory before it is ever joined to a path.
  if (value.file.includes('/') || value.file.includes('\\')) return null;

  const createdAt =
    typeof value.createdAt === 'number' && Number.isFinite(value.createdAt)
      ? value.createdAt
      : Date.now();

  return {
    id: value.id,
    file: value.file,
    title: clampString(value.title, 200),
    createdAt,
    updatedAt:
      typeof value.updatedAt === 'number' && Number.isFinite(value.updatedAt)
        ? value.updatedAt
        : createdAt,
  };
}

function sanitizeContext(value: unknown): AeroProjectContext {
  if (!isObjectRecord(value)) return { ...EMPTY_CONTEXT };

  // Notes used to be a single string. Migrate it into one untitled note so
  // existing scratch space is not lost when the multi-note model lands.
  const notes: AeroProjectNote[] = Array.isArray(value.notes)
    ? value.notes
        .map(sanitizeNote)
        .filter((note): note is AeroProjectNote => note !== null)
        .slice(0, MAX_NOTES)
    : typeof value.notes === 'string' && value.notes.trim()
      ? [
          {
            // Deterministic id so repeated reads of a not-yet-migrated file
            // resolve to the same note (a random id would 404 on first save).
            id: 'legacy-notes',
            title: 'Notes',
            body: clampString(value.notes, MAX_NOTE_BODY),
            createdAt: Date.now(),
            updatedAt: Date.now(),
          },
        ]
      : [];

  const todos = Array.isArray(value.todos)
    ? value.todos
        .map(sanitizeTodo)
        .filter((todo): todo is AeroProjectTodo => todo !== null)
        .slice(0, MAX_TODOS)
    : [];

  const queue = Array.isArray(value.queue)
    ? value.queue
        .map(sanitizeQueueMessage)
        .filter(
          (message): message is AeroProjectQueueMessage => message !== null,
        )
        .slice(0, MAX_QUEUE)
    : [];

  const plans = Array.isArray(value.plans)
    ? value.plans
        .map(sanitizePlan)
        .filter((plan): plan is AeroProjectPlan => plan !== null)
        .slice(0, MAX_PLANS)
    : [];

  return { notes, todos, queue, plans };
}

// ---------------------------------------------------------------------------
// Reads / writes
// ---------------------------------------------------------------------------

/** Read the context. A missing file is authoritative empty data. */
export async function readContext(
  workspaceId: string,
): Promise<AeroProjectContext> {
  assertValidWorkspaceId(workspaceId);

  try {
    const raw = await readFile(contextFile(workspaceId), 'utf8');
    return sanitizeContext(JSON.parse(raw));
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return { ...EMPTY_CONTEXT };
    }
    // Unparseable JSON is a failure, not empty data — surface it so the client
    // keeps what it has instead of rendering an empty panel over intact data.
    throw error;
  }
}

async function writeContext(
  workspaceId: string,
  context: AeroProjectContext,
): Promise<void> {
  const dir = contextDir(workspaceId);
  await mkdir(dir, { recursive: true });

  const target = contextFile(workspaceId);
  const temp = `${target}.tmp`;

  await writeFile(temp, `${JSON.stringify(context, null, 2)}\n`, 'utf8');
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
// Mutators
// ---------------------------------------------------------------------------

export async function createNote(
  workspaceId: string,
  input: { title?: unknown; body?: unknown },
): Promise<{ note: AeroProjectNote; context: AeroProjectContext }> {
  assertValidWorkspaceId(workspaceId);

  return withLock(workspaceId, async () => {
    const context = await readContext(workspaceId);

    if (context.notes.length >= MAX_NOTES) {
      throw new Error(`A workspace can hold at most ${MAX_NOTES} notes`);
    }

    const now = Date.now();
    const note: AeroProjectNote = {
      id: randomUUID(),
      title: clampString(input.title, MAX_NOTE_TITLE),
      body: clampString(input.body, MAX_NOTE_BODY),
      createdAt: now,
      updatedAt: now,
    };

    context.notes = [note, ...context.notes];
    await writeContext(workspaceId, context);

    return { note, context };
  });
}

export async function saveNote(
  workspaceId: string,
  noteId: string,
  input: { title?: unknown; body?: unknown },
): Promise<AeroProjectContext | null> {
  assertValidWorkspaceId(workspaceId);

  return withLock(workspaceId, async () => {
    const context = await readContext(workspaceId);
    const note = context.notes.find((entry) => entry.id === noteId);
    if (!note) return null;

    if (input.title !== undefined) {
      note.title = clampString(input.title, MAX_NOTE_TITLE);
    }
    if (input.body !== undefined) {
      note.body = clampString(input.body, MAX_NOTE_BODY);
    }
    note.updatedAt = Date.now();

    await writeContext(workspaceId, context);
    return context;
  });
}

export async function deleteNote(
  workspaceId: string,
  noteId: string,
): Promise<{ deleted: boolean; context: AeroProjectContext }> {
  assertValidWorkspaceId(workspaceId);

  return withLock(workspaceId, async () => {
    const context = await readContext(workspaceId);
    const next = context.notes.filter((entry) => entry.id !== noteId);

    if (next.length === context.notes.length) {
      return { deleted: false, context };
    }

    context.notes = next;
    await writeContext(workspaceId, context);
    return { deleted: true, context };
  });
}

export async function saveTodos(
  workspaceId: string,
  todos: unknown,
): Promise<AeroProjectContext> {
  assertValidWorkspaceId(workspaceId);

  if (!Array.isArray(todos)) {
    throw new Error('todos must be an array');
  }

  const sanitized = todos
    .map(sanitizeTodo)
    .filter((todo): todo is AeroProjectTodo => todo !== null)
    .slice(0, MAX_TODOS);

  if (sanitized.length !== todos.length) {
    throw new Error('todos must be an array of todo items');
  }

  return withLock(workspaceId, async () => {
    const context = await readContext(workspaceId);
    context.todos = sanitized;
    await writeContext(workspaceId, context);
    return context;
  });
}

export async function saveQueue(
  workspaceId: string,
  queue: unknown,
): Promise<AeroProjectContext> {
  assertValidWorkspaceId(workspaceId);

  if (!Array.isArray(queue)) {
    throw new Error('queue must be an array');
  }

  const sanitized = queue
    .map(sanitizeQueueMessage)
    .filter((message): message is AeroProjectQueueMessage => message !== null)
    .slice(0, MAX_QUEUE);

  if (sanitized.length !== queue.length) {
    throw new Error('queue must be an array of queued messages');
  }

  return withLock(workspaceId, async () => {
    const context = await readContext(workspaceId);
    context.queue = sanitized;
    await writeContext(workspaceId, context);
    return context;
  });
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

function titleFromMarkdown(body: string, fallback: string): string {
  const heading = body.match(/^\s*#\s+(.+?)\s*$/m);
  return heading?.[1]?.trim() || fallback;
}

async function uniquePlanFile(
  workspaceId: string,
  title: string,
): Promise<string> {
  const dir = plansDir(workspaceId);
  await mkdir(dir, { recursive: true });

  const slug = slugify(title) || 'plan';
  const base = `${Date.now()}-${slug}`;

  let candidate = `${base}.md`;
  let suffix = 1;
  const existing = new Set(await readdir(dir));

  while (existing.has(candidate)) {
    candidate = `${base}-${suffix}.md`;
    suffix += 1;
  }

  return candidate;
}

export async function createPlan(
  workspaceId: string,
  input: { title?: unknown; body: unknown },
): Promise<{ plan: AeroProjectPlan; context: AeroProjectContext }> {
  assertValidWorkspaceId(workspaceId);

  if (typeof input.body !== 'string' || !input.body.trim()) {
    throw new Error('Plan body is required');
  }
  if (input.body.length > MAX_PLAN_BYTES) {
    throw new Error('Plan is too large');
  }

  const body = input.body;
  const providedTitle =
    typeof input.title === 'string' ? input.title.trim() : '';

  return withLock(workspaceId, async () => {
    const context = await readContext(workspaceId);

    if (context.plans.length >= MAX_PLANS) {
      throw new Error(`A workspace can hold at most ${MAX_PLANS} plans`);
    }

    const title = titleFromMarkdown(body, providedTitle || 'Untitled plan');

    const file = await uniquePlanFile(workspaceId, title);
    const now = Date.now();

    // Write the markdown before the manifest entry. A partial failure leaves an
    // unreferenced file, which is inert — the reverse would list a plan that
    // cannot be opened.
    await writeFile(join(plansDir(workspaceId), file), body, 'utf8');

    const plan: AeroProjectPlan = {
      id: randomUUID(),
      file,
      title,
      createdAt: now,
      updatedAt: now,
    };

    context.plans = [...context.plans, plan];
    await writeContext(workspaceId, context);

    return { plan, context };
  });
}

export async function readPlan(
  workspaceId: string,
  planId: string,
): Promise<AeroProjectPlanContent | null> {
  assertValidWorkspaceId(workspaceId);

  const context = await readContext(workspaceId);
  const plan = context.plans.find((entry) => entry.id === planId);
  if (!plan) return null;

  try {
    const content = await readFile(
      join(plansDir(workspaceId), plan.file),
      'utf8',
    );
    return { plan, content };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return null;
    throw error;
  }
}

export async function deletePlan(
  workspaceId: string,
  planId: string,
): Promise<{ deleted: boolean; context: AeroProjectContext }> {
  assertValidWorkspaceId(workspaceId);

  return withLock(workspaceId, async () => {
    const context = await readContext(workspaceId);
    const plan = context.plans.find((entry) => entry.id === planId);

    if (!plan) {
      return { deleted: false, context };
    }

    // Remove the manifest entry before the file. If the file survives it is
    // unreferenced and inert; the reverse would list a plan that fails to open.
    context.plans = context.plans.filter((entry) => entry.id !== planId);
    await writeContext(workspaceId, context);

    await rm(join(plansDir(workspaceId), plan.file), { force: true });

    return { deleted: true, context };
  });
}
