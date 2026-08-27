import { ApiError, ToolState } from '@opencode-ai/sdk';
import {
  Agent,
  Command,
  Config,
  FilePart,
  FilePartSource,
  Provider,
  SessionStatus,
  ToolListItem,
} from '@opencode-ai/sdk/v2';

export type HarnessId = 'opencode' | 'codex' | 'claude' | (string & {});
export type ConversationRole = 'user' | 'assistant' | 'system';

export interface AeroWorktreeSummary {
  id: string;
  name: string;
  directory: string;
  sessions: AeroSessionSummary[];
  hasMoreSessions: boolean;
}

export interface AeroWorkspaceSummary {
  id: string;
  name: string;
  directory: string;
  worktrees: AeroWorktreeSummary[];
  createdAt: number;
  updatedAt: number;
}

export interface AeroSessionSummary {
  id: string;
  title: string;
  harnessId: HarnessId;
  parentId?: string;
  sharedUrl?: string;
  workspace: string;
  createdAt: number;
  updatedAt: number;
  revert?: {
    messageID?: string;
  };
}

export type AeroPartRequest =
  | {
      type: 'text';
      text: string;
      synthetic?: boolean;
      ignored?: boolean;
      time?: { start: number; end?: number };
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'subtask';
      prompt: string;
      description: string;
      agent: string;
      model?: { providerID: string; modelID: string };
      command?: string;
    }
  | {
      type: 'reasoning';
      text: string;
      metadata?: Record<string, unknown>;
      time?: { start: number; end?: number };
    }
  | {
      type: 'file';
      mime: string;
      filename?: string;
      url: string;
      source?: FilePartSource;
    }
  | {
      type: 'tool';
      callID: string;
      toolName: string;
      status: ToolState['status'];
      input: Record<string, unknown>;
      output?: string;
      error?: string;
      title?: string;
      duration?: number;
      attachments?: FilePart[];
      metadata?: Record<string, unknown>;
    }
  | {
      type: 'step-start';
      snapshot?: string;
    }
  | {
      type: 'step-finish';
      reason: string;
      snapshot?: string;
      cost: number;
      tokens: {
        total?: number;
        input: number;
        output: number;
        reasoning: number;
        cache: { read: number; write: number };
      };
    }
  | {
      type: 'snapshot';
      snapshot: string;
    }
  | {
      type: 'patch';
      hash: string;
      files: string[];
    }
  | {
      type: 'agent';
      name: string;
      source?: { value: string; start: number; end: number };
    }
  | {
      type: 'retry';
      attempt: number;
      error: ApiError;
      time: { created: number };
    }
  | {
      type: 'compaction';
      auto: boolean;
      overflow?: boolean;
      tail_start_id?: string;
    };

export type AeroPart = AeroPartRequest & {
  id: string;
  sessionID: string;
  messageID: string;
};

export interface AeroSessionContextDetails {
  provider: string;
  model: string;
  createdAt: number;
  context: {
    used: number;
    usedPercentage: number;
    limit: number;
    outputLimit: number;
  };
  messages: number;
  user: number;
  assistant: number;
  cost: number;
  lastAssistantMessage: {
    input: number;
    output: number;
    reasoning: number;
    cacheRead: number;
    cacheWrite: number;
    cacheHit: number;
  };
  distribution: {
    userPercentage: number;
    assistantPercentage: number;
    toolCallPercentage: number;
    otherPercentage: number;
  };
  rawMessages: {
    id: string;
    role: ConversationRole;
    text: string;
    createdAt: number;
    input: number;
    output: number;
    rawContent: string;
  }[];
}

export interface AeroTodo {
  content: string;
  status: string;
  priority: string;
}

export interface AeroAssistantError {
  name?: string;
  data?: {
    message?: string;
  };
}

export interface AeroMessage {
  id: string;
  sessionId: string;
  role: ConversationRole;
  parts: AeroPart[];
  error?: AeroAssistantError;
  createdAt: number;
}

export interface AeroTocItem {
  groupIndex: number;
  id: string;
  label: string;
}

export interface AeroConversationTurn {
  id: string;
  role: ConversationRole;
  parts: AeroPart[];
  error?: AeroAssistantError;
  createdAt: number;
}

export interface AeroMarkdownExport {
  title: string;
  markdown: string;
}

export type AeroSessionStatus =
  | { type: 'idle' }
  | { type: 'busy' }
  | {
      type: 'retry';
      attempt: number;
      message: string;
      next: number;
    };

export type AeroEvent =
  | {
      type: 'message.updated';
      sessionId: string;
      message: AeroMessage;
    }
  | {
      type: 'message.part.updated';
      sessionId: string;
      messageId: string;
      part: AeroPart;
    }
  | {
      type: 'message.part.delta';
      sessionId: string;
      messageId: string;
      partId: string;
      field: 'text';
      delta: string;
    }
  | {
      type: 'message.part.removed';
      sessionId: string;
      messageId: string;
      partId: string;
    }
  | {
      type: 'message.removed';
      sessionId: string;
      messageId: string;
    }
  | {
      type: 'session.updated';
      session: AeroSessionSummary;
    }
  | {
      type: 'session.status';
      sessionId: string;
      status: AeroSessionStatus;
    }
  | {
      type: 'session.idle';
      sessionId: string;
    }
  | {
      type: 'session.diff';
      sessionId: string;
      diff: unknown;
    }
  | {
      type: 'session.error';
      sessionId?: string;
      error: string;
    };

export interface CreateSessionInput {
  title?: string;
  harnessId?: HarnessId;
  directory?: string;
}

export interface RenameSessionInput {
  sessionId: string;
  title: string;
}

export interface SendMessageInput {
  parts: AeroPartRequest[];
  model?: { providerId: string; modelId: string };
  system?: string;
  agent?: string;
}

export interface CreateWorkspaceInput {
  name?: string;
  directory: string;
  worktrees?: Array<{ name?: string; directory: string }>;
}

export interface UpdateWorkspaceInput {
  name?: string;
  directory?: string;
}

export interface AddWorktreeInput {
  name?: string;
  directory: string;
}

export interface BasePaginationParams {
  cursor?: string;
  limit?: number;
  search?: string;
}

export interface ListSessionsParams extends BasePaginationParams {
  directory?: string;
  archived?: boolean;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}

export interface StreamEventsOptions {
  sessionId?: string;
  signal?: AbortSignal;
}

export type AeroConfig = Config;
export type AeroProvider = Provider;
export type AeroAgent = Agent;

export type AeroAgentCompact = Pick<
  Agent,
  'name' | 'description' | 'mode' | 'native'
>;

export type AeroCommand = Command;

export interface AeroWorktreeItem {
  directory: string;
  name?: string;
  branch?: string;
  isCurrent?: boolean;
}

export interface AeroSkill {
  name: string;
  description?: string;
  location: string;
  content: string;
}

export type AeroTool = ToolListItem;

export interface HarnessAdapter {
  readonly id: HarnessId;

  listWorkspaces(
    params: BasePaginationParams,
  ): Promise<PaginatedResponse<AeroWorkspaceSummary>>;
  getWorkspace(workspaceId: string): Promise<AeroWorkspaceSummary>;
  createWorkspace(input: CreateWorkspaceInput): Promise<AeroWorkspaceSummary>;
  updateWorkspace(
    workspaceId: string,
    input: UpdateWorkspaceInput,
  ): Promise<AeroWorkspaceSummary>;
  deleteWorkspace(workspaceId: string): Promise<boolean>;
  addWorktree(
    workspaceId: string,
    input: AddWorktreeInput,
  ): Promise<AeroWorkspaceSummary>;
  removeWorktree(
    workspaceId: string,
    worktreeIdOrDir: string,
  ): Promise<AeroWorkspaceSummary>;

  initWorkspaces(): Promise<AeroWorkspaceSummary[]>;
  syncWorkspaces(): Promise<AeroWorkspaceSummary[]>;

  listMessages(sessionId: string): Promise<AeroMessage[]>;
  messagesToMarkdown(sessionId: string): Promise<AeroMarkdownExport>;
  sendMessage(sessionId: string, input: SendMessageInput): Promise<boolean>;
  sendMessageSync(
    sessionId: string,
    input: SendMessageInput,
  ): Promise<AeroMessage>;
  revertSession(
    sessionId: string,
    messageId: string,
  ): Promise<AeroSessionSummary>;
  unrevertSession(sessionId: string): Promise<AeroSessionSummary>;

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  any(sessionId: string): Promise<any>;

  getSessionStatus(directory: string): Promise<{
    [key: string]: SessionStatus;
  }>;
  listSessions(
    params: BasePaginationParams,
  ): Promise<PaginatedResponse<AeroSessionSummary>>;
  listArchivedSessions(): Promise<AeroSessionSummary[]>;
  createSession(input: CreateSessionInput): Promise<AeroSessionSummary>;
  getSession(sessionId: string): Promise<AeroSessionSummary>;
  getSessionContext(sessionId: string): Promise<AeroSessionContextDetails>;
  deleteSession(sessionId: string): Promise<boolean>;
  deleteBulkSessions(sessionIds: string[]): Promise<boolean>;
  listTocs(sessionId: string): Promise<AeroTocItem[]>;
  shareSession(sessionId: string): Promise<AeroSessionSummary>;
  unshareSession(sessionId: string): Promise<AeroSessionSummary>;
  renameSession(input: RenameSessionInput): Promise<AeroSessionSummary>;
  archiveSession(sessionId: string): Promise<AeroSessionSummary>;
  archiveBulkSessions(sessionIds: string[]): Promise<boolean>;
  unarchiveSession(sessionId: string): Promise<AeroSessionSummary>;
  unarchiveBulkSessions(sessionIds: string[]): Promise<boolean>;
  forkSession(
    sessionId: string,
    messageId: string,
  ): Promise<AeroSessionSummary>;
  listTodos(sessionId: string): Promise<AeroTodo[]>;

  abortSession(sessionId: string): Promise<boolean>;

  streamEvents(options?: StreamEventsOptions): AsyncIterable<AeroEvent>;

  listAgents(directory?: string): Promise<AeroAgent[]>;
  listAgentsCompact(directory?: string): Promise<AeroAgentCompact[]>;
  listSkills(directory?: string): Promise<AeroSkill[]>;
  listCommands(directory?: string): Promise<AeroCommand[]>;
  listTools(
    provider: string,
    model: string,
    directory?: string,
  ): Promise<AeroTool[]>;
  updateActiveModel(
    model: string,
    directory?: string,
  ): Promise<string | undefined>;

  listWorktreeNames(directory?: string): Promise<string[]>;
  createWorktree(directory: string, name: string): Promise<AeroWorktreeItem>;
  removeWorktreeItem(directory: string): Promise<boolean>;

  listProviders(directory?: string): Promise<AeroProvider[]>;
  listConfiguredProviders(directory?: string): Promise<AeroProvider[]>;
  setApiKey(provider: string, apiKey: string): Promise<boolean>;

  getConfig(directory?: string): Promise<AeroConfig>;
}
