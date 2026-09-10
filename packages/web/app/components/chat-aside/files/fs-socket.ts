import { ClientMessage, ServerMessage } from '@/server/lib/fs-ws/fs-protocol';

type ExtractByType<T extends { type: string }, K extends T['type']> = Extract<
  T,
  { type: K }
>;

interface PendingEntry {
  resolve: (value: ServerMessage) => void;
  reject: (reason: Error) => void;
  onProgress?: (msg: ExtractByType<ServerMessage, 'search:result'>) => void;
}

let idCounter = 0;
function nextId(): string {
  idCounter += 1;
  return `req_${idCounter}_${Date.now()}`;
}

export interface FsSocketOptions {
  /** Absolute (or server-resolvable) path on the machine running the Hono
   * server. This is NOT a browser-local path. */
  root: string;
  /** Defaults to `${origin}/api/fs-ws` with the protocol swapped to ws/wss. */
  url?: string;
  onDisconnect?: () => void;
  onReconnect?: () => void;
}

export class FsSocket {
  private ws: WebSocket | null = null;
  private pending = new Map<string, PendingEntry>();
  private reconnectAttempt = 0;
  private closedByUser = false;

  private readyPromise: Promise<void>;
  private resolveReady!: () => void;

  constructor(private readonly options: FsSocketOptions) {
    this.readyPromise = new Promise((resolve) => {
      this.resolveReady = resolve;
    });
    this.connect();
  }

  private connect(): void {
    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    const base = this.options.url ?? `${protocol}//${location.host}/api/fs-ws`;
    const url = `${base}?root=${encodeURIComponent(this.options.root)}`;
    const ws = new WebSocket(url);
    this.ws = ws;

    ws.addEventListener('open', () => {
      this.reconnectAttempt = 0;
      this.resolveReady();
      this.options.onReconnect?.();
    });

    ws.addEventListener('message', (event) => {
      let msg: ServerMessage;
      try {
        msg = JSON.parse(String(event.data));
      } catch {
        return;
      }

      const entry = this.pending.get(msg.id);
      if (!entry) return;

      if (msg.type === 'search:result') {
        entry.onProgress?.(msg);
        if (!msg.done) return; // more batches to come — keep the entry pending
      }

      this.pending.delete(msg.id);
      if (msg.type === 'error') {
        entry.reject(new Error(msg.message));
      } else {
        entry.resolve(msg);
      }
    });

    ws.addEventListener('close', () => {
      this.readyPromise = new Promise((resolve) => {
        this.resolveReady = resolve;
      });
      this.options.onDisconnect?.();
      if (this.closedByUser) return;
      const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 10_000);
      this.reconnectAttempt += 1;
      setTimeout(() => this.connect(), delay);
    });

    ws.addEventListener('error', () => {
      ws.close();
    });
  }

  private async send(message: ClientMessage): Promise<void> {
    await this.readyPromise;

    if (this.ws?.readyState !== WebSocket.OPEN) {
      throw new Error('fs socket not connected');
    }
    this.ws.send(JSON.stringify(message));
  }

  private request<K extends ServerMessage['type']>(
    message: ClientMessage,
    onProgress?: PendingEntry['onProgress'],
  ): Promise<ExtractByType<ServerMessage, K>> {
    return new Promise((resolve, reject) => {
      this.pending.set(message.id, {
        resolve: resolve as PendingEntry['resolve'],
        reject,
        onProgress,
      });

      this.send(message).catch((err) => {
        this.pending.delete(message.id);
        reject(err instanceof Error ? err : new Error('send failed'));
      });
    });
  }

  /** Non-recursive: lists only the immediate children of `dirPath`. */
  list(dirPath: string, cursor?: string) {
    return this.request<'list:result'>({
      id: nextId(),
      type: 'list',
      path: dirPath,
      cursor,
    });
  }

  read(filePath: string) {
    return this.request<'read:result'>({
      id: nextId(),
      type: 'read',
      path: filePath,
    });
  }

  /** Recursive filename search across the whole root. `onBatch` fires once
   * per incremental batch; the returned promise resolves with the final
   * batch once the server reports `done: true`. */
  search(
    query: string,
    onBatch: (matches: string[]) => void,
    maxResults = 500,
  ) {
    return this.request<'search:result'>(
      { id: nextId(), type: 'search', query, maxResults },
      (msg) => onBatch(msg.matches),
    );
  }

  close(): void {
    this.closedByUser = true;
    this.ws?.close();
  }
}
