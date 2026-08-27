import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';

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
        const data = JSON.parse(event.data);

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
        rejectOpen(new Error(`Session stream closed: ${sessionId}`));
      }
    };

    this.connections.set(sessionId, connection);

    return openPromise;
  }

  close(sessionId: string) {
    const connection = this.connections.get(sessionId);

    if (!connection) {
      return;
    }

    connection.source.close();
    this.connections.delete(sessionId);
  }

  closeAll() {
    for (const sessionId of this.connections.keys()) {
      this.close(sessionId);
    }
  }

  has(sessionId: string) {
    return this.connections.has(sessionId);
  }
}

export const sessionStreamManager = new SessionStreamManager();
