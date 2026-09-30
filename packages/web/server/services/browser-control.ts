// server/services/browser-control.ts
//
// Command bus between the server-side agent tool and the client-side browser
// panel. The agent's `aero_web` actions are forwarded here; the always-mounted
// browser panel long-polls `/api/browser-control/poll`, executes the action
// against the live preview, and posts the result back. The server holds the
// pending promise so the tool call can await the live page.
//
// Long-polling (rather than SSE) is deliberate: the panel is connected as soon
// as the app loads, independent of whether the Browser panel is open, which
// lets a browser tool open the panel itself instead of failing as
// "disconnected".

import { randomUUID } from 'node:crypto';

export interface BrowserCommand {
  id: string;
  action: string;
  params: Record<string, unknown>;
}

export interface BrowserCommandResult {
  ok: boolean;
  data?: unknown;
  error?: string;
}

interface PendingCommand {
  resolve: (data: unknown) => void;
  reject: (error: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface Waiter {
  resolve: (command: BrowserCommand | null) => void;
  timer: ReturnType<typeof setTimeout>;
}

const DEFAULT_TIMEOUT_MS = 30_000;

/**
 * How long a poll keeps the client considered "connected". A long-poll that is
 * open registers as connected immediately; between polls the timestamp below
 * bridges the gap so a tool call arriving mid-loop still sees a client.
 */
const CLIENT_TTL_MS = 20_000;

const queue: BrowserCommand[] = [];
const waiters = new Set<Waiter>();
const pending = new Map<string, PendingCommand>();

let lastPollAt = 0;

export function hasBrowserClient(): boolean {
  return waiters.size > 0 || Date.now() - lastPollAt < CLIENT_TTL_MS;
}

function flushQueue() {
  while (queue.length > 0 && waiters.size > 0) {
    const command = queue.shift() as BrowserCommand;
    const waiter = waiters.values().next().value as Waiter;

    waiters.delete(waiter);
    clearTimeout(waiter.timer);
    waiter.resolve(command);
  }
}

/**
 * Long-poll for the next queued command. Resolves with the command as soon as
 * one is queued, or `null` on timeout / client abort.
 */
export function waitForBrowserCommand(
  timeoutMs: number,
  signal?: AbortSignal,
): Promise<BrowserCommand | null> {
  lastPollAt = Date.now();

  if (queue.length > 0) {
    return Promise.resolve(queue.shift() as BrowserCommand);
  }

  return new Promise((resolve) => {
    let settled = false;

    const finish = (command: BrowserCommand | null) => {
      if (settled) return;
      settled = true;
      waiters.delete(waiter);
      clearTimeout(waiter.timer);
      signal?.removeEventListener('abort', onAbort);
      resolve(command);
    };

    const onAbort = () => finish(null);

    const waiter: Waiter = {
      resolve: finish,
      timer: setTimeout(() => finish(null), timeoutMs),
    };

    signal?.addEventListener('abort', onAbort, { once: true });

    if (signal?.aborted) {
      finish(null);
      return;
    }

    waiters.add(waiter);
  });
}

/** Resolve (or reject) the tool call waiting on a browser command. */
export function completeBrowserCommand(
  id: string,
  result: BrowserCommandResult,
): boolean {
  const entry = pending.get(id);

  if (!entry) {
    return false;
  }

  pending.delete(id);
  clearTimeout(entry.timer);

  if (result.ok) {
    entry.resolve(result.data);
  } else {
    entry.reject(new Error(result.error || 'Browser action failed'));
  }

  return true;
}

export function requestBrowserAction(
  action: string,
  params: Record<string, unknown>,
  options: { signal?: AbortSignal; timeoutMs?: number } = {},
): Promise<unknown> {
  if (!hasBrowserClient()) {
    return Promise.reject(
      new Error(
        'No Aero browser panel is connected. Open the Browser panel and try again.',
      ),
    );
  }

  const id = randomUUID();
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const { signal } = options;

  return new Promise((resolve, reject) => {
    let settled = false;

    const settle = (error?: Error, data?: unknown) => {
      if (settled) return;
      settled = true;
      const entry = pending.get(id);
      if (entry) {
        pending.delete(id);
        clearTimeout(entry.timer);
      }
      if (error) {
        // A timed-out or aborted command must not be delivered later.
        const index = queue.findIndex((command) => command.id === id);
        if (index !== -1) {
          queue.splice(index, 1);
        }
        reject(error);
      } else {
        resolve(data);
      }
    };

    const timer = setTimeout(() => {
      settle(new Error(`Browser action timed out: ${action}`));
    }, timeoutMs);

    pending.set(id, {
      resolve: (data) => settle(undefined, data),
      reject: (error) => settle(error),
      timer,
    });

    if (signal) {
      signal.addEventListener(
        'abort',
        () => settle(new Error('The action was aborted')),
        { once: true },
      );

      if (signal.aborted) {
        settle(new Error('The action was aborted'));
        return;
      }
    }

    queue.push({ id, action, params });
    flushQueue();
  });
}
