// server/services/harness/types.ts
//
// This is the contract every harness adapter (opencode, codex, claude, ...)
// must implement. Routes NEVER import from server/adapters/* directly —
// they only ever talk to this interface, resolved at request-time via the
// registry. That's what makes client.api.sessions.$get() work identically
// no matter which harness is actually running underneath.

export type HarnessId = 'opencode' | 'codex' | 'claude' | (string & {});
export type ConversationRole = 'user' | 'assistant' | 'system';

export interface AeroWorktreeSummary {
  name: string;
  directory: string;
  sessions: AeroSessionSummary[];
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
  workspace: string;
  createdAt: number;
  updatedAt: number;
}

// Keep this union intentionally small for MVP. Extend as adapters need to
// express more (e.g. "diff" parts, "todo" parts) — every adapter's mapper
// has to be updated to produce whichever variants it can support.
export type AeroPartRequest =
  | { type: 'text'; text: string }
  | {
      type: 'tool';
      toolName: string;
      status: 'pending' | 'running' | 'completed' | 'error';
      input?: unknown;
      output?: unknown;
      error?: string;
    }
  | { type: 'file'; path: string; mimeType?: string }
  | { type: 'reasoning'; text: string };

export type AeroPart = AeroPartRequest & { id: string };

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

  // Session Operations
  listSessions(
    params: BasePaginationParams,
  ): Promise<PaginatedResponse<AeroSessionSummary>>;
  listArchivedSessions(): Promise<AeroSessionSummary[]>;
  createSession(input: CreateSessionInput): Promise<AeroSessionSummary>;
  getSession(sessionId: string): Promise<AeroSessionSummary>;
  deleteSession(sessionId: string): Promise<boolean>;
  listMessages(sessionId: string): Promise<AeroMessage[]>;
  listTocs(sessionId: string): Promise<AeroTocItem[]>;
  messagesToMarkdown(sessionId: string): Promise<AeroMarkdownExport>;
  renameSession(input: RenameSessionInput): Promise<AeroSessionSummary>;
  archiveSession(sessionId: string): Promise<AeroSessionSummary>;
  unarchiveSession(sessionId: string): Promise<AeroSessionSummary>;
  sendMessage(sessionId: string, input: SendMessageInput): Promise<void>;
  sendMessageSync(
    sessionId: string,
    input: SendMessageInput,
  ): Promise<AeroMessage>;
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
