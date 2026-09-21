import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import type { AeroEvent } from '@/server/services/harness/types';

interface StreamOptions {
  sessionId: string;
  harnessId?: string;
}

interface Connection {
  source: EventSource;
  harnessId?: string;
  openPromise: Promise<void>;
  resolveOpen: () => void;
  rejectOpen: (error: Error) => void;
  settled: boolean;
}

type DeltaEvent = Extract<AeroEvent, { type: 'message.part.delta' }>;

interface PendingDelta {
  sessionId: string;
  event: DeltaEvent;
}

function qs(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();

  for (const [key, value] of Object.entries(params)) {
    if (value) {
      search.set(key, value);
    }
  }

  const query = search.toString();

  return query ? `?${query}` : '';
}

class SessionStreamManager {
  private connections = new Map<string, Connection>();

  private pendingDeltas = new Map<string, PendingDelta>();

  private deltaRaf: number | null = null;

  private queueDelta(sessionId: string, event: DeltaEvent) {
    const key = `${sessionId}:${event.messageId}:${event.partId}:${event.field}`;

    const existing = this.pendingDeltas.get(key);

    if (existing) {
      existing.event = {
        ...existing.event,
        delta: existing.event.delta + event.delta,
      };
    } else {
      this.pendingDeltas.set(key, {
        sessionId,
        event,
      });
    }

    this.scheduleDeltaFlush();
  }

  private scheduleDeltaFlush() {
    if (this.deltaRaf !== null) {
      return;
    }

    this.deltaRaf = requestAnimationFrame(() => {
      this.deltaRaf = null;
      this.flushAllDeltas();
    });
  }

  private flushAllDeltas() {
    if (this.pendingDeltas.size === 0) {
      return;
    }

    const pending = Array.from(this.pendingDeltas.values());

    this.pendingDeltas.clear();

    const store = useChatStore.getState();

    for (const { sessionId, event } of pending) {
      store.handleStreamEvent(sessionId, event);
    }
  }

  private flushSessionDeltas(sessionId: string) {
    if (this.pendingDeltas.size === 0) {
      return;
    }

    const sessionPending: PendingDelta[] = [];

    for (const [key, pending] of this.pendingDeltas) {
      if (pending.sessionId !== sessionId) {
        continue;
      }

      sessionPending.push(pending);
      this.pendingDeltas.delete(key);
    }

    if (sessionPending.length === 0) {
      return;
    }

    const store = useChatStore.getState();

    for (const { sessionId: pendingSessionId, event } of sessionPending) {
      store.handleStreamEvent(pendingSessionId, event);
    }
  }

  ensure({ sessionId, harnessId }: StreamOptions): Promise<void> {
    const existing = this.connections.get(sessionId);

    // Reuse an existing connection only if the harness matches AND the
    // underlying EventSource is still alive (CONNECTING or OPEN). A CLOSED
    // source can never emit again, so returning its promise would keep
    // rejecting the caller forever.
    if (
      existing &&
      existing.harnessId === harnessId &&
      existing.source.readyState !== EventSource.CLOSED
    ) {
      return existing.openPromise;
    }

    if (existing) {
      // Superseded or dead: settle its promise (resolve — not reject — so
      // we don't surface a spurious error when the session itself is
      // still being served by the connection we're about to create) and
      // evict it from the map so the next `ensure()` starts clean.
      if (!existing.settled) {
        existing.settled = true;
        existing.resolveOpen();
      }

      existing.source.close();
      this.connections.delete(sessionId);
    }

    let resolveOpen!: () => void;
    let rejectOpen!: (error: Error) => void;

    const openPromise = new Promise<void>((resolve, reject) => {
      resolveOpen = resolve;
      rejectOpen = reject;
    });

    const source = new EventSource(
      `/api/sessions/${sessionId}/stream${qs({
        harnessId,
      })}`,
    );

    const connection: Connection = {
      source,
      harnessId,
      openPromise,
      resolveOpen,
      rejectOpen,
      settled: false,
    };

    const isCurrent = () => this.connections.get(sessionId)?.source === source;

    const settle = (): boolean => {
      if (connection.settled) {
        return false;
      }

      connection.settled = true;
      return true;
    };

    // Remove the connection from the map (only if it's still the current
    // one) and close the EventSource. Idempotent.
    const teardown = () => {
      if (this.connections.get(sessionId)?.source === source) {
        this.connections.delete(sessionId);
      }

      try {
        source.close();
      } catch {
        /* ignore */
      }
    };

    const handle = (event: MessageEvent) => {
      if (!isCurrent()) {
        return;
      }

      try {
        const data: AeroEvent = JSON.parse(event.data);

        if (data.type === 'message.part.delta') {
          this.queueDelta(sessionId, data);
          return;
        }

        /**
         * Preserve event ordering:
         * anything other than a delta must see all previous
         * deltas for this session first.
         */
        this.flushSessionDeltas(sessionId);

        useChatStore.getState().handleStreamEvent(sessionId, data);
      } catch (error) {
        console.error(
          '[SessionStream] failed to parse event',
          sessionId,
          error,
        );
      }
    };

    const handleReady = () => {
      if (!isCurrent()) {
        return;
      }

      if (settle()) {
        connection.resolveOpen();
      }
    };

    const handleIdle = (event: MessageEvent) => {
      if (!isCurrent()) {
        return;
      }

      handle(event);

      /**
       * handle() flushes deltas synchronously before processing idle.
       * At this point the stream can safely be removed.
       */
      teardown();

      // If we somehow missed `ready`, still settle so awaiting callers
      // don't hang.
      if (settle()) {
        connection.resolveOpen();
      }
    };

    source.addEventListener('ready', handleReady);

    source.addEventListener('message.updated', handle);
    source.addEventListener('message.part.updated', handle);
    source.addEventListener('message.part.delta', handle);
    source.addEventListener('message.part.removed', handle);
    source.addEventListener('message.removed', handle);
    source.addEventListener('session.status', handle);
    source.addEventListener('session.updated', handle);
    source.addEventListener('session.idle', handleIdle);
    source.addEventListener('session.error', handle);
    source.addEventListener('permission.asked', handle);
    source.addEventListener('permission.replied', handle);
    source.addEventListener('todo.updated', handle);

    source.onerror = () => {
      if (!isCurrent()) {
        return;
      }

      if (source.readyState === EventSource.CLOSED) {
        this.flushSessionDeltas(sessionId);

        // Evict BEFORE rejecting so any concurrent/subsequent
        // `ensure(sessionId)` sees a clean map and creates a fresh
        // EventSource instead of reusing the dead one.
        teardown();

        if (settle()) {
          connection.rejectOpen(
            new Error(`Session stream closed: ${sessionId}`),
          );
        }
      }
    };

    this.connections.set(sessionId, connection);

    return openPromise;
  }

  close(sessionId: string) {
    this.flushSessionDeltas(sessionId);

    const connection = this.connections.get(sessionId);

    if (!connection) {
      return;
    }

    // Settle so callers awaiting `ensure()` don't hang if they're still
    // pending when we're told to close.
    if (!connection.settled) {
      connection.settled = true;
      connection.resolveOpen();
    }

    connection.source.close();
    this.connections.delete(sessionId);
  }

  closeAll() {
    this.flushAllDeltas();

    for (const sessionId of [...this.connections.keys()]) {
      this.close(sessionId);
    }
  }

  has(sessionId: string) {
    return this.connections.has(sessionId);
  }
}

export const sessionStreamManager = new SessionStreamManager();
