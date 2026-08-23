// server/services/harness/types.ts
//
// This is the contract every harness adapter (opencode, codex, claude, ...)
// must implement. Routes NEVER import from server/adapters/* directly —
// they only ever talk to this interface, resolved at request-time via the
// registry. That's what makes client.api.sessions.$get() work identically
// no matter which harness is actually running underneath.

import { ApiError, ToolState } from '@opencode-ai/sdk';
import { FilePart, FilePartSource } from '@opencode-ai/sdk/v2';

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
}

// Keep this union intentionally small for MVP. Extend as adapters need to
// express more (e.g. "diff" parts, "todo" parts) — every adapter's mapper
// has to be updated to produce whichever variants it can support.
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
  provider: string; // last used provider
  model: string; // last used model
  createdAt: number; // first message created at
  context: {
    used: number; // total used
    usedPercentage: number; // total used / limit
    limit: number; // limit of last used model (set 0 for now if unavailable)
    outputLimit: number;
  };
  messages: number; // total number of messages
  user: number; // total number sent by role 'user'
  assistant: number; // total number sent by role 'assistant'
  cost: number; // all message costs summed up
  lastAssistantMessage: {
    input: number;
    output: number;
    reasoning: number;
    cacheRead: number;
    cacheWrite: number;
    cacheHit: number; // cache read / (input + cache read) * 100
  };
  distribution: {
    userPercentage: number; // percentage of messages sent by user (role: user)
    assistantPercentage: number; // percentage of messages sent by assistant (type: reasoning, text)
    toolCallPercentage: number; // percentanges of messages that is of type tool
    otherPercentage: number; // others
  };
  rawMessages: {
    id: string;
    role: ConversationRole;
    text: string; // each message's part type joined by '-', to not include: 'step-start', 'step-finish'
    createdAt: number;
    input: number;
    output: number;
    rawContent: string; // the message json itself
  }[];
}

export interface AeroMessage {
  id: string;
  sessionId: string;
  role: ConversationRole;
  parts: AeroPart[];
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
  createdAt: number;
}

export interface AeroMarkdownExport {
  title: string;
  markdown: string;
}

// Events an adapter can emit over its live stream. Route layer relays these
// verbatim as SSE payloads, so the shape here IS the wire contract with the
// frontend @aero/ui chat components.
export type AeroEvent =
  | { type: 'message.updated'; sessionId: string; message: AeroMessage }
  | {
      type: 'message.part.updated';
      sessionId: string;
      messageId: string;
      part: AeroPart;
    }
  | { type: 'session.updated'; session: AeroSessionSummary }
  | { type: 'session.idle'; sessionId: string }
  | { type: 'session.error'; sessionId?: string; error: string };

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

export interface ListSessionsParams extends BasePaginationParams {
  directory?: string;
  archived?: boolean;
}

export interface StreamEventsOptions {
  /** Filter to a single session's events. Omit for a global/workspace stream. */
  sessionId?: string;
  signal?: AbortSignal;
}

export interface HarnessAdapter {
  readonly id: HarnessId;

  // Workspace Operations
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

  // Initial Bootstrapping & Syncing
  initWorkspaces(): Promise<AeroWorkspaceSummary[]>;
  syncWorkspaces(): Promise<AeroWorkspaceSummary[]>;

  // Messages Opereations
  listMessages(sessionId: string): Promise<AeroMessage[]>;
  messagesToMarkdown(sessionId: string): Promise<AeroMarkdownExport>;
  sendMessage(sessionId: string, input: SendMessageInput): Promise<void>;
  sendMessageSync(
    sessionId: string,
    input: SendMessageInput,
  ): Promise<AeroMessage>;
  revertMessage(
    sessionId: string,
    messageId: string,
  ): Promise<AeroSessionSummary>;
  unrevertMessage(sessionId: string): Promise<AeroSessionSummary>;

  // Session Operations
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

  abortSession(sessionId: string): Promise<boolean>;

  /** Live event stream, already normalized to AeroEvent. */
  streamEvents(options?: StreamEventsOptions): AsyncIterable<AeroEvent>;
}

export interface BasePaginationParams {
  cursor?: string;
  limit?: number;
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  nextCursor?: string;
}
