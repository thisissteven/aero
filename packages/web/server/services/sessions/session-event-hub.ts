import type { AeroEvent, StreamEventsOptions } from '../harness/types';

interface StreamEventsHarness {
  streamEvents(options?: StreamEventsOptions): AsyncIterable<AeroEvent>;
}

interface Subscriber {
  sessionId: string;
  queue: AeroEvent[];
  resolveNext: (() => void) | null;
  closed: boolean;
}

const MAX_QUEUE_SIZE = 512;

const RECONNECT_INITIAL_MS = 250;
const RECONNECT_MAX_MS = 10_000;

const IDLE_SHUTDOWN_GRACE_MS = 30_000;

function getEventSessionId(event: AeroEvent): string | null {
  if ('sessionId' in event && typeof event.sessionId === 'string') {
    return event.sessionId;
  }

  if (event.type === 'session.updated') {
    return event.session.id;
  }

  return null;
}

function delay(ms: number, signal?: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal?.aborted) {
      resolve(false);
      return;
    }

    let settled = false;

    const finish = (result: boolean) => {
      if (settled) {
        return;
      }

      settled = true;

      clearTimeout(timer);
      signal?.removeEventListener('abort', onAbort);

      resolve(result);
    };

    const timer = setTimeout(() => {
      finish(true);
    }, ms);

    const onAbort = () => {
      finish(false);
    };

    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

class SessionEventHub {
  private readonly getHarness: () => Promise<StreamEventsHarness>;

  private readonly subscribers = new Set<Subscriber>();

  private upstreamController: AbortController | null = null;
  private upstreamTask: Promise<void> | null = null;

  private readyPromise: Promise<void> | null = null;
  private resolveReady: (() => void) | null = null;
  private rejectReady: ((error: Error) => void) | null = null;

  private shutdownTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(getHarness: () => Promise<StreamEventsHarness>) {
    this.getHarness = getHarness;
  }

  async waitUntilReady(): Promise<void> {
    if (this.upstreamController && this.readyPromise === null) {
      return;
    }

    this.ensureReadyPromise();
    this.ensureUpstream();

    await this.readyPromise;
  }

  private ensureReadyPromise() {
    if (this.readyPromise) {
      return;
    }

    this.readyPromise = new Promise<void>((resolve, reject) => {
      this.resolveReady = resolve;
      this.rejectReady = reject;
    });
  }

  subscribe(sessionId: string): AsyncIterable<AeroEvent> {
    this.cancelScheduledShutdown();

    const subscriber: Subscriber = {
      sessionId,
      queue: [],
      resolveNext: null,
      closed: false,
    };

    this.subscribers.add(subscriber);

    this.ensureUpstream();

    return this.createIterable(subscriber);
  }

  private ensureUpstream() {
    if (this.subscribers.size === 0 || this.upstreamTask) {
      return;
    }

    this.ensureReadyPromise();

    const task = this.runUpstream();

    this.upstreamTask = task;

    void task.finally(() => {
      if (this.upstreamTask === task) {
        this.upstreamTask = null;
      }

      if (this.subscribers.size > 0) {
        this.ensureUpstream();
      }
    });
  }

  private async runUpstream() {
    let reconnectDelay = RECONNECT_INITIAL_MS;

    const controller = new AbortController();

    this.upstreamController = controller;

    try {
      while (!controller.signal.aborted && this.subscribers.size > 0) {
        try {
          const harness = await this.getHarness();

          for await (const event of harness.streamEvents({
            signal: controller.signal,

            onConnected: () => {
              this.resolveReady?.();
              this.resolveReady = null;
              this.rejectReady = null;
              this.readyPromise = null;
            },
          })) {
            if (controller.signal.aborted) {
              break;
            }

            this.dispatch(event);

            reconnectDelay = RECONNECT_INITIAL_MS;
          }

          if (controller.signal.aborted || this.subscribers.size === 0) {
            break;
          }

          throw new Error('OpenCode global event stream ended unexpectedly');
        } catch (error) {
          if (controller.signal.aborted || this.subscribers.size === 0) {
            break;
          }

          this.readyPromise = null;
          this.resolveReady = null;
          this.rejectReady = null;

          this.ensureReadyPromise();

          console.warn(
            `[SessionEventHub] upstream disconnected; reconnecting in ${reconnectDelay}ms`,
            error,
          );

          const reconnect = await delay(reconnectDelay, controller.signal);

          if (!reconnect) {
            break;
          }

          reconnectDelay = Math.min(reconnectDelay * 2, RECONNECT_MAX_MS);
        }
      }
    } finally {
      if (this.upstreamController === controller) {
        this.upstreamController = null;
      }

      controller.abort();

      if (this.subscribers.size === 0) {
        this.readyPromise = null;
        this.resolveReady = null;
        this.rejectReady = null;
      }
    }
  }

  private createIterable(subscriber: Subscriber): AsyncIterable<AeroEvent> {
    const removeSubscriber = this.removeSubscriber.bind(this, subscriber);

    async function* iterate() {
      try {
        while (!subscriber.closed) {
          if (subscriber.queue.length > 0) {
            const event = subscriber.queue.shift();

            if (event) {
              yield event;
            }

            continue;
          }

          await new Promise<void>((resolve) => {
            if (subscriber.closed) {
              resolve();
              return;
            }

            subscriber.resolveNext = resolve;
          });
        }
      } finally {
        removeSubscriber();
      }
    }

    return {
      [Symbol.asyncIterator]: iterate,
    };
  }

  private dispatch(event: AeroEvent) {
    const sessionId = getEventSessionId(event);

    /**
     * session.updated and the other mapped events
     * should normally contain enough information to
     * identify their session.
     *
     * Ignore truly global events that don't belong
     * to one specific session.
     */
    if (!sessionId) {
      return;
    }

    for (const subscriber of this.subscribers) {
      if (subscriber.closed || subscriber.sessionId !== sessionId) {
        continue;
      }

      this.push(subscriber, event);
    }
  }

  private push(subscriber: Subscriber, event: AeroEvent) {
    if (subscriber.closed) {
      return;
    }

    if (subscriber.queue.length >= MAX_QUEUE_SIZE) {
      console.warn('[SessionEventHub] closing slow subscriber', {
        sessionId: subscriber.sessionId,
        queueSize: subscriber.queue.length,
      });

      this.removeSubscriber(subscriber);

      return;
    }

    subscriber.queue.push(event);

    const resolveNext = subscriber.resolveNext;

    subscriber.resolveNext = null;

    resolveNext?.();
  }

  private removeSubscriber(subscriber: Subscriber) {
    if (subscriber.closed) {
      return;
    }

    subscriber.closed = true;
    subscriber.queue.length = 0;

    const resolveNext = subscriber.resolveNext;

    subscriber.resolveNext = null;

    resolveNext?.();

    this.subscribers.delete(subscriber);

    if (this.subscribers.size === 0) {
      this.scheduleShutdown();
    }
  }

  private scheduleShutdown() {
    if (this.shutdownTimer) {
      return;
    }

    this.shutdownTimer = setTimeout(() => {
      this.shutdownTimer = null;

      if (this.subscribers.size === 0) {
        this.stopUpstream();
      }
    }, IDLE_SHUTDOWN_GRACE_MS);
  }

  private cancelScheduledShutdown() {
    if (!this.shutdownTimer) {
      return;
    }

    clearTimeout(this.shutdownTimer);

    this.shutdownTimer = null;
  }

  private stopUpstream() {
    this.upstreamController?.abort();
    this.upstreamController = null;
  }

  getStats() {
    return {
      subscribers: this.subscribers.size,

      sessionIds: [...this.subscribers].map(
        (subscriber) => subscriber.sessionId,
      ),

      upstreamConnected: this.upstreamController !== null,
    };
  }
}

const globalKey = '__aero_session_event_hubs__';

type HubRegistry = Map<string, SessionEventHub>;

const globalScope = globalThis as typeof globalThis & {
  [globalKey]?: HubRegistry;
};

const hubs = (globalScope[globalKey] ??= new Map<string, SessionEventHub>());

function getHubKey(harnessId?: string) {
  return harnessId ?? 'default';
}

export function getSessionEventHub(
  harnessId: string | undefined,
  getHarness: () => Promise<StreamEventsHarness>,
) {
  const key = getHubKey(harnessId);

  let hub = hubs.get(key);

  if (!hub) {
    hub = new SessionEventHub(getHarness);

    hubs.set(key, hub);
  }

  return hub;
}
