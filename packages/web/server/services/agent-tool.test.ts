import { describe, expect, it } from 'bun:test';
import {
  type AgentToolDeps,
  executeAgentToolRequest,
} from '@/server/services/agent-tool';
import type {
  AeroAutomation,
  AeroMessage,
  AeroSessionSummary,
  AeroWorkspaceSummary,
  HarnessAdapter,
} from '@/server/services/harness/types';

function session(
  overrides: Partial<AeroSessionSummary> = {},
): AeroSessionSummary {
  return {
    id: 'ses_1',
    title: 'Session',
    harnessId: 'opencode',
    workspace: '/repo',
    createdAt: 1,
    updatedAt: 1,
    readOnly: false,
    archived: false,
    ...overrides,
  };
}

function message(overrides: Partial<AeroMessage> = {}): AeroMessage {
  return {
    id: 'msg_1',
    sessionId: 'ses_1',
    role: 'assistant',
    parts: [
      {
        id: 'part_1',
        sessionID: 'ses_1',
        messageID: 'msg_1',
        type: 'text',
        text: 'hello',
      },
    ],
    createdAt: 1,
    ...overrides,
  };
}

function automation(overrides: Partial<AeroAutomation> = {}): AeroAutomation {
  return {
    id: 'task_1',
    name: 'Nightly',
    enabled: true,
    schedule: { kind: 'daily', times: ['09:00'] },
    execution: { prompt: 'do it', providerID: 'anthropic', modelID: 'claude' },
    state: { createdAt: 1, updatedAt: 1 },
    ...overrides,
  };
}

interface Spies {
  upsert?: unknown;
}

function makeDeps(
  adapterOverrides: Partial<HarnessAdapter>,
  spies: Spies = {},
): AgentToolDeps {
  const adapter = {
    listWorkspaces: async () => ({
      items: [
        {
          id: 'ws_1',
          name: 'Aero',
          directory: '/repo',
          worktrees: [],
          createdAt: 1,
          updatedAt: 1,
        },
      ],
    }),
    getWorkspace: async () => ({
      id: 'ws_1',
      name: 'Aero',
      directory: '/repo',
      worktrees: [],
      createdAt: 1,
      updatedAt: 1,
    }),
    getWorkspaceByDirectory: async () => ({
      id: 'ws_1',
      name: 'Aero',
      directory: '/repo',
      worktrees: [],
      createdAt: 1,
      updatedAt: 1,
    }),
    listSessions: async () => ({ items: [session()] }),
    getSession: async () => session(),
    getSessionStatus: async () => ({ ses_1: { type: 'idle' as const } }),
    listMessages: async () => [message()],
    createSession: async () => session({ id: 'ses_new' }),
    sendMessage: () => true,
    forkSession: async () => session({ id: 'ses_fork' }),
    createWorktree: async () => ({ directory: '/repo-wt' }),
    ...adapterOverrides,
  } as unknown as HarnessAdapter;

  return {
    adapter: async () => adapter,
    getRecentVariants: async () => ({ 'anthropic/claude': 'high' }),
    automations: {
      list: async () => [automation()],
      upsert: async (_workspaceId, input) => {
        spies.upsert = input;
        return { tasks: [automation()], task: automation(), created: true };
      },
      remove: async () => [],
      run: async () => ({ sessionId: 'ses_run' }),
      status: async () => ({
        hasEnabledAutomations: true,
        hasRunningAutomations: false,
        enabledAutomationsCount: 1,
        runningAutomationsCount: 0,
      }),
    },
  };
}

describe('executeAgentToolRequest', () => {
  it('rejects an unknown action with a usage error envelope', async () => {
    const result = await executeAgentToolRequest(
      { input: { action: 'session.delete' } },
      {},
      makeDeps({}),
    );
    expect(result.ok).toBe(false);
    expect(result.action).toBe('session.delete');
    expect(result.error?.kind).toBe('usage');
  });

  it('returns the project list', async () => {
    const result = await executeAgentToolRequest(
      { input: { action: 'projects.list' } },
      {},
      makeDeps({}),
    );
    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      projects: [{ id: 'ws_1', name: 'Aero', directory: '/repo' }],
    });
  });

  it('lists sessions scoped to the context directory', async () => {
    let seenDirectory: string | undefined;
    const deps = makeDeps({
      listSessions: async (params: unknown) => {
        seenDirectory = (params as { directory?: string }).directory;
        return { items: [session()] };
      },
    });

    const result = await executeAgentToolRequest(
      { input: { action: 'session.list' }, contextDirectory: '/repo' },
      {},
      deps,
    );

    expect(seenDirectory).toBe('/repo');
    expect(result.ok).toBe(true);
    const data = result.data as { sessions: unknown[] };
    expect(data.sessions).toHaveLength(1);
  });

  it('requires a sessionId for session.send', async () => {
    const result = await executeAgentToolRequest(
      { input: { action: 'session.send', prompt: 'hi' } },
      {},
      makeDeps({}),
    );
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('usage');
    expect(result.error?.message).toContain('sessionId');
  });

  it('aborts a wait when the request signal fires', async () => {
    const controller = new AbortController();
    controller.abort();

    const result = await executeAgentToolRequest(
      {
        input: {
          action: 'session.send',
          sessionId: 'ses_1',
          prompt: 'hi',
          wait: true,
        },
      },
      { signal: controller.signal },
      makeDeps({
        getSessionStatus: async () => ({ ses_1: { type: 'busy' as const } }),
      }),
    );

    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('runtime');
    expect(result.error?.message).toContain('aborted');
  });

  it('returns recent models and the workspace default', async () => {
    const result = await executeAgentToolRequest(
      {
        input: { action: 'models.list' },
        contextDirectory: '/repo',
      },
      {},
      makeDeps({
        getWorkspaceByDirectory: async () =>
          ({
            id: 'ws_1',
            name: 'Aero',
            directory: '/repo',
            worktrees: [],
            createdAt: 1,
            updatedAt: 1,
            defaultModel: 'anthropic/claude',
          }) as AeroWorkspaceSummary,
      }),
    );

    expect(result.ok).toBe(true);
    expect(result.data).toEqual({
      defaultModel: 'anthropic/claude',
      recentModels: [{ model: 'anthropic/claude', variant: 'high' }],
    });
  });

  it('requires a model for schedule.create', async () => {
    const result = await executeAgentToolRequest(
      {
        input: {
          action: 'schedule.create',
          name: 'Task',
          prompt: 'go',
          daily: '09:00',
        },
        contextDirectory: '/repo',
      },
      {},
      makeDeps({}),
    );
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('usage');
    expect(result.error?.message).toContain('model');
  });

  it('creates a schedule with a daily selector', async () => {
    const spies: Spies = {};
    const result = await executeAgentToolRequest(
      {
        input: {
          action: 'schedule.create',
          name: 'Task',
          prompt: 'go',
          model: 'anthropic/claude',
          daily: '09:00',
        },
        contextDirectory: '/repo',
      },
      {},
      makeDeps({}, spies),
    );

    expect(result.ok).toBe(true);
    expect(spies.upsert).toMatchObject({
      name: 'Task',
      enabled: true,
      schedule: { kind: 'daily', times: ['09:00'] },
      execution: { prompt: 'go', providerID: 'anthropic', modelID: 'claude' },
    });
  });

  it('requires the disabled boolean for schedule.toggle', async () => {
    const result = await executeAgentToolRequest(
      {
        input: { action: 'schedule.toggle', taskId: 'task_1' },
        contextDirectory: '/repo',
      },
      {},
      makeDeps({}),
    );
    expect(result.ok).toBe(false);
    expect(result.error?.kind).toBe('usage');
    expect(result.error?.message).toContain('disabled');
  });

  it('toggles a schedule by flipping enabled', async () => {
    const spies: Spies = {};
    const result = await executeAgentToolRequest(
      {
        input: { action: 'schedule.toggle', taskId: 'task_1', disabled: true },
        contextDirectory: '/repo',
      },
      {},
      makeDeps({}, spies),
    );

    expect(result.ok).toBe(true);
    expect(spies.upsert).toMatchObject({ id: 'task_1', enabled: false });
  });
});
