// server/services/agent-tool.ts
//
// Server side of the managed `aero` OpenCode tool. OpenCode runs the generated
// plugin, the plugin POSTs a typed action here (see routes/agent-tool.ts), and
// this service dispatches it to the existing harness/automation services. The
// action allowlist is deliberately narrower than the full control surface:
// session and worktree deletion and project-path registration are not exposed.

import { mkdir, writeFile } from 'node:fs/promises';
import { join, relative } from 'node:path';

import { z } from 'zod';

import { AERO_DIR, GET_ALL_LIMIT } from '@/server/helper';
import type {
  AeroAutomation,
  AeroAutomationSchedule,
  AeroAutomationStatusSummary,
  AeroPart,
  AeroPartUserMessage,
  AeroSessionStatus,
  AeroSessionSummary,
  HarnessAdapter,
  ListSessionsParams,
} from '@/server/services/harness/types';
import {
  list as automationsList,
  remove as automationsRemove,
  run as automationsRun,
  status as automationsStatus,
  upsert as automationsUpsert,
} from './automations';
import type { AutomationInput } from './automations/store';
import { hasBrowserClient, requestBrowserAction } from './browser-control';
import { buildGoalIntroText, createSessionGoal } from './goal/store';
import { getActiveAdapter } from './harness/registry';
import { getSettings } from './settings';

export const AGENT_TOOL_SCHEMA_VERSION = 1;

export const CONTROL_ACTIONS = [
  'projects.list',
  'models.list',
  'session.list',
  'session.create',
  'session.send',
  'session.fork',
  'session.status',
  'session.messages',
  'schedule.list',
  'schedule.create',
  'schedule.run',
  'schedule.delete',
  'schedule.toggle',
] as const;

export const BROWSER_ACTIONS = [
  'browser.open',
  'browser.snapshot',
  'browser.click',
  'browser.type',
  'browser.scroll',
  'browser.back',
  'browser.forward',
  'browser.inspect',
  'browser.capture',
  'browser.resize',
] as const;

export const AGENT_ACTIONS = [...CONTROL_ACTIONS, ...BROWSER_ACTIONS] as const;

export type AgentAction = (typeof AGENT_ACTIONS)[number];
export type BrowserAction = (typeof BROWSER_ACTIONS)[number];

const ACTION_SET = new Set<string>(AGENT_ACTIONS);
const BROWSER_ACTION_SET = new Set<string>(BROWSER_ACTIONS);

export type AgentToolErrorKind = 'usage' | 'runtime';

/** A failure with a caller-facing kind, so the route can label it usage vs runtime. */
export class AgentToolError extends Error {
  constructor(
    message: string,
    readonly kind: AgentToolErrorKind = 'usage',
  ) {
    super(message);
    this.name = 'AgentToolError';
  }
}

export interface AgentToolRequestContext {
  contextDirectory?: string;
  sessionID?: string;
  signal?: AbortSignal;
}

export interface AgentToolResult {
  schemaVersion: number;
  ok: boolean;
  action: string;
  data?: unknown;
  error?: { message: string; kind: AgentToolErrorKind };
}

export interface AgentToolAutomations {
  list(workspaceId: string): Promise<AeroAutomation[]>;
  upsert(
    workspaceId: string,
    input: AutomationInput,
  ): Promise<{
    tasks: AeroAutomation[];
    task: AeroAutomation;
    created: boolean;
  }>;
  remove(workspaceId: string, taskId: string): Promise<AeroAutomation[]>;
  run(workspaceId: string, taskId: string): Promise<{ sessionId?: string }>;
  status(): Promise<AeroAutomationStatusSummary>;
}

export interface AgentToolDeps {
  adapter: () => Promise<HarnessAdapter>;
  automations: AgentToolAutomations;
  getRecentVariants: () => Promise<Record<string, string>>;
}

const defaultDeps: AgentToolDeps = {
  adapter: () => getActiveAdapter(),
  automations: {
    list: automationsList,
    upsert: automationsUpsert,
    remove: automationsRemove,
    run: automationsRun,
    status: automationsStatus,
  },
  getRecentVariants: async () =>
    (await getSettings()).recentModelVariants ?? {},
};

const paramsSchema = z.object({
  projectId: z.string().optional(),
  directory: z.string().optional(),
  sessionId: z.string().optional(),
  messageId: z.string().optional(),
  taskId: z.string().optional(),
  title: z.string().optional(),
  prompt: z.string().optional(),
  model: z.string().optional(),
  agent: z.string().optional(),
  variant: z.string().optional(),
  worktree: z.string().optional(),
  branch: z.string().optional(),
  startRef: z.string().optional(),
  setUpstream: z.boolean().optional(),
  goal: z.boolean().optional(),
  goalTokenBudget: z.number().int().optional(),
  wait: z.boolean().optional(),
  timeout: z.number().int().optional(),
  lastAssistant: z.boolean().optional(),
  limit: z.number().int().positive().optional(),
  all: z.boolean().optional(),
  last: z.boolean().optional(),
  withStatus: z.boolean().optional(),
  role: z.enum(['all', 'user', 'assistant']).optional(),
  name: z.string().optional(),
  daily: z.string().optional(),
  weekly: z.string().optional(),
  once: z.string().optional(),
  time: z.string().optional(),
  cron: z.string().optional(),
  timezone: z.string().optional(),
  disabled: z.boolean().optional(),
  url: z.string().optional(),
  selector: z.string().optional(),
  text: z.string().optional(),
  value: z.string().optional(),
  submit: z.boolean().optional(),
  direction: z.enum(['up', 'down', 'top', 'bottom']).optional(),
  viewport: z.enum(['mobile', 'tablet', 'desktop', 'fill']).optional(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  dpr: z.number().positive().optional(),
  fullPage: z.boolean().optional(),
  label: z.string().optional(),
});

export type AgentToolParams = z.infer<typeof paramsSchema>;

const DEFAULT_LIMIT = 10;
const DEFAULT_WAIT_TIMEOUT_SECONDS = 600;
const MAX_WAIT_TIMEOUT_SECONDS = 86_400;
const WAIT_POLL_MS = 1_000;

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== 'string') return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function requireString(value: string | undefined, message: string): string {
  if (!value) throw new AgentToolError(message, 'usage');
  return value;
}

function parseModelRef(
  model?: string,
): { providerId: string; modelId: string } | undefined {
  if (!model) return undefined;
  const index = model.indexOf('/');
  if (index <= 0 || index === model.length - 1) {
    throw new AgentToolError(
      `Invalid model "${model}"; use provider/model`,
      'usage',
    );
  }
  return {
    providerId: model.slice(0, index),
    modelId: model.slice(index + 1),
  };
}

function projectSession(session: AeroSessionSummary) {
  return {
    id: session.id,
    title: session.title,
    directory: session.workspace,
    parentId: session.parentId,
    createdAt: session.createdAt,
    updatedAt: session.updatedAt,
    archived: session.archived,
    agent: session.agent,
    model: session.model,
  };
}

function partText(part: AeroPart): string {
  return part.type === 'text' && typeof part.text === 'string' ? part.text : '';
}

function messageText(message: { parts: AeroPart[] }): string {
  return message.parts.map(partText).filter(Boolean).join('\n').trim();
}

function projectMessage(message: {
  id: string;
  role: string;
  createdAt: number;
  parts: AeroPart[];
}) {
  return {
    id: message.id,
    role: message.role,
    text: messageText(message),
    createdAt: message.createdAt,
  };
}

function lastAssistantText(
  messages: { role: string; parts: AeroPart[] }[],
): string {
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i].role === 'assistant') {
      return messageText(messages[i]);
    }
  }
  return '';
}

function summarizeTask(task: AeroAutomation) {
  return {
    id: task.id,
    name: task.name,
    enabled: task.enabled,
    schedule: task.schedule,
    nextRunAt: task.state.nextRunAt,
    lastRunAt: task.state.lastRunAt,
    lastStatus: task.state.lastStatus,
    lastError: task.state.lastError,
    lastSessionId: task.state.lastSessionId,
  };
}

async function resolveDirectory(
  deps: AgentToolDeps,
  params: AgentToolParams,
  ctx: AgentToolRequestContext,
): Promise<string | undefined> {
  if (params.directory) return params.directory;
  if (params.projectId) {
    const adapter = await deps.adapter();
    const workspace = await adapter.getWorkspace(params.projectId);
    return workspace.directory;
  }
  return ctx.contextDirectory;
}

async function resolveWorkspaceId(
  deps: AgentToolDeps,
  params: AgentToolParams,
  ctx: AgentToolRequestContext,
): Promise<string> {
  if (params.projectId) return params.projectId;
  const directory = params.directory ?? ctx.contextDirectory;
  if (!directory) {
    throw new AgentToolError(
      'A projectId or directory is required to scope this action',
      'usage',
    );
  }
  const adapter = await deps.adapter();
  const workspace = await adapter.getWorkspaceByDirectory(directory);
  return workspace.id;
}

function buildSchedule(params: AgentToolParams): AeroAutomationSchedule | null {
  if (params.cron) {
    return { kind: 'cron', cron: params.cron, timezone: params.timezone };
  }
  if (params.once) {
    return {
      kind: 'once',
      date: params.once,
      time: params.time || '09:00',
      timezone: params.timezone,
    };
  }
  if (params.weekly) {
    const weekdays = params.weekly
      .split(',')
      .map((value) => Number.parseInt(value.trim(), 10))
      .filter((value) => Number.isInteger(value) && value >= 0 && value <= 6);
    if (weekdays.length === 0) return null;
    return {
      kind: 'weekly',
      weekdays,
      times: [params.time || '09:00'],
      timezone: params.timezone,
    };
  }
  if (params.daily) {
    return { kind: 'daily', times: [params.daily], timezone: params.timezone };
  }
  return null;
}

async function waitForIdle(
  adapter: HarnessAdapter,
  sessionId: string,
  directory: string,
  timeoutSeconds: number,
  signal?: AbortSignal,
): Promise<AeroSessionStatus> {
  const deadline = Date.now() + timeoutSeconds * 1000;
  // eslint-disable-next-line no-constant-condition
  while (true) {
    if (signal?.aborted) {
      throw new AgentToolError('The action was aborted', 'runtime');
    }
    const status = await readStatus(adapter, sessionId, directory);
    if (status.type === 'idle') return status;
    if (Date.now() >= deadline) {
      throw new AgentToolError(
        'Timed out waiting for the session to become idle',
        'runtime',
      );
    }
    await sleep(WAIT_POLL_MS);
  }
}

async function readStatus(
  adapter: HarnessAdapter,
  sessionId: string,
  directory: string,
): Promise<AeroSessionStatus> {
  try {
    const statuses = await adapter.getSessionStatus(directory);
    return (statuses[sessionId] as AeroSessionStatus) ?? { type: 'idle' };
  } catch {
    return { type: 'idle' };
  }
}

async function sendPrompt(
  adapter: HarnessAdapter,
  sessionId: string,
  directory: string,
  params: AgentToolParams,
  prompt: string,
): Promise<void> {
  const parts: AeroPartUserMessage[] = [{ type: 'text', text: prompt }];

  if (params.goal) {
    const goal = await createSessionGoal({
      harness: adapter,
      sessionId,
      directory,
      objective: prompt,
      tokenBudget: params.goalTokenBudget ?? null,
    });
    if (goal) {
      parts.push({
        type: 'text',
        text: buildGoalIntroText(goal.tokenBudget),
        synthetic: true,
      } as AeroPartUserMessage);
    }
  }

  adapter.sendMessage(
    sessionId,
    {
      parts,
      model: parseModelRef(params.model),
      agent: params.agent,
      variant: params.variant,
    },
    directory,
  );
}

/**
 * After a dispatch, optionally block until the session is idle and, when
 * requested, surface the final assistant text. Only used when `wait` is set —
 * dispatches return immediately by default.
 */
async function settleDispatch(
  adapter: HarnessAdapter,
  sessionId: string,
  directory: string,
  params: AgentToolParams,
  ctx: AgentToolRequestContext,
): Promise<Record<string, unknown>> {
  if (!params.wait) return {};

  const timeoutSeconds = Math.min(
    Math.max(params.timeout ?? DEFAULT_WAIT_TIMEOUT_SECONDS, 1),
    MAX_WAIT_TIMEOUT_SECONDS,
  );
  const status = await waitForIdle(
    adapter,
    sessionId,
    directory,
    timeoutSeconds,
    ctx.signal,
  );

  const result: Record<string, unknown> = { sessionId, status };
  if (params.lastAssistant) {
    const messages = await adapter.listMessages(sessionId);
    result.lastAssistant = lastAssistantText(messages);
  }
  return result;
}

async function saveBrowserCapture(
  data: unknown,
  ctx: AgentToolRequestContext,
): Promise<unknown> {
  const record = (data ?? {}) as {
    dataUrl?: string;
    mime?: string;
    pageUrl?: string;
    pageTitle?: string;
    width?: number;
    height?: number;
    dpr?: number;
  };
  const dataUrl = typeof record.dataUrl === 'string' ? record.dataUrl : '';

  if (!dataUrl.startsWith('data:')) {
    throw new AgentToolError('The browser returned no screenshot', 'runtime');
  }

  const comma = dataUrl.indexOf(',');
  const header = dataUrl.slice(5, comma);
  const base64 = dataUrl.slice(comma + 1);
  const mime =
    typeof record.mime === 'string'
      ? record.mime
      : header.split(';')[0] || 'image/png';
  const ext =
    mime === 'image/jpeg' ? 'jpg' : mime === 'image/webp' ? 'webp' : 'png';

  const directory = ctx.contextDirectory
    ? join(ctx.contextDirectory, '.aero', 'captures')
    : join(AERO_DIR, 'captures');
  await mkdir(directory, { recursive: true });

  const filePath = join(directory, `capture-${Date.now().toString(36)}.${ext}`);
  await writeFile(filePath, Buffer.from(base64, 'base64'));

  return {
    path: filePath,
    relativePath: ctx.contextDirectory
      ? relative(ctx.contextDirectory, filePath)
      : undefined,
    directory: ctx.contextDirectory,
    pageUrl: record.pageUrl,
    pageTitle: record.pageTitle,
    ...(typeof record.width === 'number' ? { width: record.width } : {}),
    ...(typeof record.height === 'number' ? { height: record.height } : {}),
    ...(typeof record.dpr === 'number' ? { dpr: record.dpr } : {}),
    mime,
  };
}

async function executeBrowserAction(
  action: BrowserAction,
  params: AgentToolParams,
  ctx: AgentToolRequestContext,
): Promise<unknown> {
  if (!hasBrowserClient()) {
    throw new AgentToolError(
      'No Aero browser panel is connected. Open the Browser panel and try again.',
      'runtime',
    );
  }

  const data = await requestBrowserAction(
    action,
    params as Record<string, unknown>,
    { signal: ctx.signal },
  );

  if (action === 'browser.capture') {
    return saveBrowserCapture(data, ctx);
  }

  return data;
}

export async function executeAgentAction(
  action: AgentAction,
  params: AgentToolParams,
  ctx: AgentToolRequestContext,
  deps: AgentToolDeps = defaultDeps,
): Promise<unknown> {
  if (BROWSER_ACTION_SET.has(action)) {
    return executeBrowserAction(action as BrowserAction, params, ctx);
  }

  switch (action) {
    case 'projects.list': {
      const adapter = await deps.adapter();
      const result = await adapter.listWorkspaces({ limit: GET_ALL_LIMIT });
      return {
        projects: result.items.map((workspace) => ({
          id: workspace.id,
          name: workspace.name,
          directory: workspace.directory,
        })),
      };
    }

    case 'models.list': {
      const recent = await deps.getRecentVariants();
      const directory = await resolveDirectory(deps, params, ctx);
      let defaultModel: string | null = null;
      if (directory) {
        const adapter = await deps.adapter();
        try {
          const workspace = await adapter.getWorkspaceByDirectory(directory);
          defaultModel = workspace.defaultModel ?? null;
        } catch {
          defaultModel = null;
        }
      }
      return {
        defaultModel,
        recentModels: Object.entries(recent).map(([model, variant]) => ({
          model,
          variant,
        })),
      };
    }

    case 'session.list': {
      const adapter = await deps.adapter();
      const directory = await resolveDirectory(deps, params, ctx);
      const listParams: ListSessionsParams = {
        ...(directory ? { directory } : {}),
        limit: params.limit ?? DEFAULT_LIMIT,
        archived: params.all === true,
      };
      const result = await adapter.listSessions(listParams);
      let sessions = result.items.map(projectSession);

      if (params.withStatus && directory) {
        const statuses = await adapter
          .getSessionStatus(directory)
          .catch(() => ({}) as Record<string, AeroSessionStatus>);
        sessions = sessions.map((session) => ({
          ...session,
          status: (statuses[session.id] as AeroSessionStatus) ?? {
            type: 'idle',
          },
        }));
      }

      return { sessions };
    }

    case 'session.create': {
      const adapter = await deps.adapter();
      let directory = await resolveDirectory(deps, params, ctx);
      if (!directory) {
        throw new AgentToolError(
          'A directory is required to create a session',
          'usage',
        );
      }

      if (params.worktree) {
        const worktree = await adapter.createWorktree(
          directory,
          params.worktree,
        );
        directory = worktree.directory;
      }

      const session = await adapter.createSession({
        title: params.title,
        directory,
        harnessId: 'opencode',
      });

      if (params.prompt) {
        await sendPrompt(adapter, session.id, directory, params, params.prompt);
      }

      const settled = params.prompt
        ? await settleDispatch(adapter, session.id, directory, params, ctx)
        : {};

      return {
        session: projectSession(session),
        dispatched: Boolean(params.prompt),
        ...settled,
      };
    }

    case 'session.send': {
      const adapter = await deps.adapter();
      const sessionId = requireString(
        params.sessionId,
        'sessionId is required',
      );
      const prompt = requireString(params.prompt, 'prompt is required');
      const session = await adapter.getSession(sessionId);
      const directory = params.directory ?? session.workspace;

      await sendPrompt(adapter, session.id, directory, params, prompt);
      const settled = await settleDispatch(
        adapter,
        session.id,
        directory,
        params,
        ctx,
      );

      return { sessionId: session.id, dispatched: true, ...settled };
    }

    case 'session.fork': {
      const adapter = await deps.adapter();
      const sessionId = requireString(
        params.sessionId,
        'sessionId is required',
      );
      const messageId = requireString(
        params.messageId,
        'messageId is required',
      );
      const forked = await adapter.forkSession(sessionId, messageId);
      const directory = params.directory ?? forked.workspace;

      if (params.prompt) {
        await sendPrompt(adapter, forked.id, directory, params, params.prompt);
      }
      const settled = params.prompt
        ? await settleDispatch(adapter, forked.id, directory, params, ctx)
        : {};

      return {
        session: projectSession(forked),
        dispatched: Boolean(params.prompt),
        ...settled,
      };
    }

    case 'session.status': {
      const adapter = await deps.adapter();
      const sessionId = requireString(
        params.sessionId,
        'sessionId is required',
      );
      const session = await adapter.getSession(sessionId);
      const status = await readStatus(
        adapter,
        session.id,
        params.directory ?? session.workspace,
      );
      return { sessionId: session.id, status };
    }

    case 'session.messages': {
      const adapter = await deps.adapter();
      const sessionId = requireString(
        params.sessionId,
        'sessionId is required',
      );
      const session = await adapter.getSession(sessionId);
      const directory = params.directory ?? session.workspace;

      if (params.wait) {
        await waitForIdle(
          adapter,
          session.id,
          directory,
          Math.min(
            Math.max(params.timeout ?? DEFAULT_WAIT_TIMEOUT_SECONDS, 1),
            MAX_WAIT_TIMEOUT_SECONDS,
          ),
          ctx.signal,
        );
      }

      const all = await adapter.listMessages(session.id);
      const role = params.role ?? 'all';
      const filtered = all.filter(
        (message) => role === 'all' || message.role === role,
      );

      let messages = filtered;
      if (params.last) {
        messages = filtered.slice(-1);
      } else if (!params.all) {
        messages = filtered.slice(-(params.limit ?? DEFAULT_LIMIT));
      }

      const sessionStatus = await readStatus(adapter, session.id, directory);

      return {
        sessionId: session.id,
        sessionStatus,
        messages: messages.map(projectMessage),
        ...(params.lastAssistant
          ? { lastAssistant: lastAssistantText(filtered) }
          : {}),
      };
    }

    case 'schedule.list': {
      const workspaceId = await resolveWorkspaceId(deps, params, ctx);
      const [tasks, status] = await Promise.all([
        deps.automations.list(workspaceId),
        deps.automations.status(),
      ]);
      return {
        workspaceId,
        tasks: tasks.map(summarizeTask),
        status,
      };
    }

    case 'schedule.create': {
      const workspaceId = await resolveWorkspaceId(deps, params, ctx);
      const name = requireString(params.name, 'name is required');
      const prompt = requireString(params.prompt, 'prompt is required');
      const model = parseModelRef(
        requireString(params.model, 'model is required'),
      );
      if (!model) {
        throw new AgentToolError('model must be provider/model', 'usage');
      }
      const schedule = buildSchedule(params);
      if (!schedule) {
        throw new AgentToolError(
          'One schedule selector is required: cron, once, weekly, or daily',
          'usage',
        );
      }

      const input: AutomationInput = {
        name,
        enabled: true,
        schedule,
        execution: {
          prompt,
          providerID: model.providerId,
          modelID: model.modelId,
          ...(params.agent ? { agent: params.agent } : {}),
          ...(params.variant ? { variant: params.variant } : {}),
          ...(params.goal === true ? { goalEnabled: true } : {}),
          ...(params.goalTokenBudget
            ? { goalTokenBudget: params.goalTokenBudget }
            : {}),
        },
      };

      const result = await deps.automations.upsert(workspaceId, input);
      return {
        workspaceId,
        created: result.created,
        task: summarizeTask(result.task),
      };
    }

    case 'schedule.run': {
      const workspaceId = await resolveWorkspaceId(deps, params, ctx);
      const taskId = requireString(params.taskId, 'taskId is required');
      const result = await deps.automations.run(workspaceId, taskId);
      return { workspaceId, taskId, sessionId: result.sessionId };
    }

    case 'schedule.delete': {
      const workspaceId = await resolveWorkspaceId(deps, params, ctx);
      const taskId = requireString(params.taskId, 'taskId is required');
      await deps.automations.remove(workspaceId, taskId);
      return { workspaceId, taskId, deleted: true };
    }

    case 'schedule.toggle': {
      const workspaceId = await resolveWorkspaceId(deps, params, ctx);
      const taskId = requireString(params.taskId, 'taskId is required');
      if (typeof params.disabled !== 'boolean') {
        throw new AgentToolError('disabled is required', 'usage');
      }

      const tasks = await deps.automations.list(workspaceId);
      const existing = tasks.find((task) => task.id === taskId);
      if (!existing) {
        throw new AgentToolError('Automation not found', 'usage');
      }

      const result = await deps.automations.upsert(workspaceId, {
        id: existing.id,
        name: existing.name,
        enabled: !params.disabled,
        schedule: existing.schedule,
        execution: existing.execution,
      });
      return { workspaceId, task: summarizeTask(result.task) };
    }

    default: {
      throw new AgentToolError(
        `Unsupported Aero action: ${String(action)}`,
        'usage',
      );
    }
  }
}

function formatIssues(error: z.ZodError): string {
  return error.issues
    .map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    })
    .join('; ');
}

const failure = (
  action: string,
  message: string,
  kind: AgentToolErrorKind,
): AgentToolResult => ({
  schemaVersion: AGENT_TOOL_SCHEMA_VERSION,
  ok: false,
  action,
  error: { message, kind },
});

/**
 * Parse a plugin callback into an action call and produce the shared result
 * envelope. Every failure path still answers with the envelope so the caller
 * never has to distinguish a transport error from a tool error.
 */
export async function executeAgentToolRequest(
  payload: unknown,
  ctx: AgentToolRequestContext = {},
  deps: AgentToolDeps = defaultDeps,
): Promise<AgentToolResult> {
  const body = (payload ?? {}) as {
    input?: Record<string, unknown>;
    contextDirectory?: unknown;
    sessionID?: unknown;
  };
  const input = body.input ?? {};
  const requested = asNonEmptyString(input.action) ?? 'unknown';

  if (!ACTION_SET.has(requested)) {
    return failure(requested, `Unsupported Aero action: ${requested}`, 'usage');
  }

  const { action: _action, ...raw } = input;
  const parsed = paramsSchema.safeParse(raw);
  if (!parsed.success) {
    return failure(requested, formatIssues(parsed.error), 'usage');
  }

  const requestContext: AgentToolRequestContext = {
    contextDirectory: asNonEmptyString(body.contextDirectory),
    sessionID: asNonEmptyString(body.sessionID),
    signal: ctx.signal,
  };

  try {
    const data = await executeAgentAction(
      requested as AgentAction,
      parsed.data,
      requestContext,
      deps,
    );
    return {
      schemaVersion: AGENT_TOOL_SCHEMA_VERSION,
      ok: true,
      action: requested,
      data,
    };
  } catch (error) {
    if (error instanceof AgentToolError) {
      return failure(requested, error.message, error.kind);
    }
    return failure(
      requested,
      error instanceof Error ? error.message : String(error),
      'runtime',
    );
  }
}
