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

    if (existing && existing.harnessId === harnessId) {
      return existing.openPromise;
    }

    existing?.source.close();

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
    };

    const isCurrent = () => this.connections.get(sessionId)?.source === source;

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

      resolveOpen();
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
      const current = this.connections.get(sessionId);

      if (current?.source === source) {
        source.close();
        this.connections.delete(sessionId);
      }
    };

    source.addEventListener('ready', handleReady);

    source.addEventListener('message.updated', handle);
    source.addEventListener('message.part.updated', handle);
    source.addEventListener('message.part.delta', handle);
    source.addEventListener('message.part.removed', handle);
    source.addEventListener('message.removed', handle);
    source.addEventListener('session.status', handle);
    source.addEventListener('session.idle', handleIdle);
    source.addEventListener('session.error', handle);

    source.onerror = () => {
      if (!isCurrent()) {
        return;
      }

      if (source.readyState === EventSource.CLOSED) {
        this.flushSessionDeltas(sessionId);
        rejectOpen(new Error(`Session stream closed: ${sessionId}`));
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

    connection.source.close();
    this.connections.delete(sessionId);
  }

  closeAll() {
    this.flushAllDeltas();

    for (const sessionId of this.connections.keys()) {
      this.close(sessionId);
    }
  }

  has(sessionId: string) {
    return this.connections.has(sessionId);
  }
}

export const sessionStreamManager = new SessionStreamManager();
