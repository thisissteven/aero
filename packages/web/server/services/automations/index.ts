// server/services/automations/index.ts
//
// Thin service layer over the automation store and runtime: resolves the
// workspace, delegates persistence, and keeps the runtime's in-memory schedule
// in sync after every mutation.

import { GET_ALL_LIMIT } from '@/server/helper';
import { getActiveAdapter } from '@/server/services/harness/registry';

import type {
  AeroAutomation,
  AeroAutomationStatusSummary,
  AeroWorkspaceSummary,
} from '../harness/types';
import { type AutomationRunEvent, automationsRuntime } from './runtime';
import {
  type AutomationInput,
  deleteAutomation,
  listAutomations,
  upsertAutomation,
} from './store';

export class AutomationError extends Error {
  constructor(
    message: string,
    readonly statusCode = 400,
  ) {
    super(message);
    this.name = 'AutomationError';
  }
}

async function listWorkspaces(): Promise<AeroWorkspaceSummary[]> {
  const adapter = await getActiveAdapter();
  const result = await adapter.listWorkspaces({ limit: GET_ALL_LIMIT });
  return result.items;
}

async function findWorkspace(
  workspaceId: string,
): Promise<AeroWorkspaceSummary> {
  const id = typeof workspaceId === 'string' ? workspaceId.trim() : '';
  if (!id) throw new AutomationError('workspaceId is required', 400);
  const workspaces = await listWorkspaces();
  const workspace = workspaces.find((entry) => entry.id === id);
  if (!workspace) throw new AutomationError('Workspace not found', 404);
  return workspace;
}

export async function list(workspaceId: string): Promise<AeroAutomation[]> {
  await findWorkspace(workspaceId);
  return automationsRuntime.syncWorkspace(workspaceId);
}

export async function upsert(
  workspaceId: string,
  taskInput: AutomationInput,
): Promise<{
  tasks: AeroAutomation[];
  task: AeroAutomation;
  created: boolean;
}> {
  await findWorkspace(workspaceId);
  let result;
  try {
    result = await upsertAutomation(workspaceId, taskInput);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to save automation';
    const invalid =
      message.toLowerCase().includes('required') ||
      message.toLowerCase().includes('invalid') ||
      message.toLowerCase().includes('must be') ||
      message.toLowerCase().includes('at most');
    throw new AutomationError(message, invalid ? 400 : 500);
  }
  const tasks = await automationsRuntime.syncWorkspace(workspaceId);
  return {
    tasks,
    task: tasks.find((task) => task.id === result.task.id) || result.task,
    created: result.created,
  };
}

export async function remove(
  workspaceId: string,
  taskId: string,
): Promise<AeroAutomation[]> {
  await findWorkspace(workspaceId);
  const id = typeof taskId === 'string' ? taskId.trim() : '';
  if (!id) throw new AutomationError('taskId is required', 400);

  let result;
  try {
    result = await deleteAutomation(workspaceId, id);
  } catch (error) {
    const message =
      error instanceof Error ? error.message : 'Failed to delete automation';
    const invalid =
      message.toLowerCase().includes('required') ||
      message.toLowerCase().includes('managed by');
    throw new AutomationError(message, invalid ? 400 : 500);
  }
  if (!result.deleted) throw new AutomationError('Automation not found', 404);
  return automationsRuntime.syncWorkspace(workspaceId);
}

export async function run(
  workspaceId: string,
  taskId: string,
): Promise<{ sessionId?: string }> {
  await findWorkspace(workspaceId);
  const id = typeof taskId === 'string' ? taskId.trim() : '';
  if (!id) throw new AutomationError('taskId is required', 400);

  const result = await automationsRuntime.runNow(workspaceId, id);
  if (result.running) {
    throw new AutomationError(
      result.error || 'Automation is already running',
      409,
    );
  }
  if (result.skipped) {
    throw new AutomationError(
      result.error || 'Automation not found or disabled',
      404,
    );
  }
  if (!result.ok) {
    throw new AutomationError(result.error || 'Automation run failed', 500);
  }
  return result.sessionID ? { sessionId: result.sessionID } : {};
}

export async function status(): Promise<AeroAutomationStatusSummary> {
  return automationsRuntime.getStatus();
}

export function subscribe(
  listener: (event: AutomationRunEvent) => void,
): () => void {
  return automationsRuntime.subscribe(listener);
}

export type { AutomationRunEvent };
