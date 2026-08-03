// server/services/harness/types.ts
//
// This is the contract every harness adapter (opencode, codex, claude, ...)
// must implement. Routes NEVER import from server/adapters/* directly —
// they only ever talk to this interface, resolved at request-time via the
// registry. That's what makes client.api.sessions.$get() work identically
// no matter which harness is actually running underneath.

export type HarnessId = 'opencode' | 'codex' | 'claude' | (string & {});

export interface AeroSessionSummary {
  id: string;
  title: string;
  harness: HarnessId;
  createdAt: number;
  updatedAt: number;
}

// Keep this union intentionally small for MVP. Extend as adapters need to
// express more (e.g. "diff" parts, "todo" parts) — every adapter's mapper
// has to be updated to produce whichever variants it can support.
export type AeroPart =
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

export interface AeroMessage {
  id: string;
  sessionId: string;
  role: 'user' | 'assistant';
  parts: AeroPart[];
  createdAt: number;
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
}

export interface SendMessageInput {
  parts: AeroPart[];
  model?: { providerId: string; modelId: string };
}

export interface StreamEventsOptions {
  /** Filter to a single session's events. Omit for a global/workspace stream. */
  sessionId?: string;
  signal?: AbortSignal;
}

export interface HarnessAdapter {
  readonly id: HarnessId;

  listSessions(): Promise<AeroSessionSummary[]>;
  createSession(input: CreateSessionInput): Promise<AeroSessionSummary>;
  getSession(sessionId: string): Promise<AeroSessionSummary>;
  deleteSession(sessionId: string): Promise<boolean>;

  listMessages(sessionId: string): Promise<AeroMessage[]>;
  sendMessage(sessionId: string, input: SendMessageInput): Promise<AeroMessage>;
  abortSession(sessionId: string): Promise<boolean>;

  /** Live event stream, already normalized to AeroEvent. */
  streamEvents(options?: StreamEventsOptions): AsyncIterable<AeroEvent>;
}
