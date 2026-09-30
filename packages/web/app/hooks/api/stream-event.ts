import { type QueryClient, useQueryClient } from '@tanstack/react-query';
import { useEffect, useRef } from 'react';

import {
  useChatStore,
  useSessionRuntime,
} from '@/app/features/chat-page/chat-feed/chat-store';
import { $individualSession } from '@/app/hooks/api/sessions';

import { apiError } from '@/app/hooks/i18n/api-errors';
import { sessionStreamManager } from '@/app/services/session-stream-manager';
import type { AeroSessionStatus } from '@/server/services/harness/types';

interface Params {
  sessionId: string;
  harnessId?: string;
}

export function useSessionStream({ sessionId, harnessId }: Params) {
  const isStreaming = useSessionRuntime(
    sessionId,
    (runtime) => runtime.isStreaming,
  );

  useEffect(() => {
    if (!sessionId || !isStreaming) {
      return;
    }

    void sessionStreamManager.ensure({
      sessionId,
      harnessId,
    });
  }, [sessionId, harnessId, isStreaming]);
}

export function useRestoreSessionStreams() {
  const hasRestored = useRef(false);

  useEffect(() => {
    if (hasRestored.current) {
      return;
    }

    hasRestored.current = true;

    const runningSessions = useChatStore.getState().runningSessions;
    const removeRunningSession = useChatStore.getState().removeRunningSession;
    const addUnreadSession = useChatStore.getState().addUnreadSession;

    if (runningSessions.length === 0) {
      return;
    }

    let cancelled = false;

    const restoreSession = async (sessionId: string) => {
      try {
        /**
         * Load everything SessionPage would load before
         * establishing the stream.
         *
         * These are independent requests, so fetch them
         * concurrently.
         */
        const [sessionRes, messagesRes, statusRes] = await Promise.all([
          $individualSession.$get({
            param: { id: sessionId },
            query: {
              harnessId: undefined,
            },
          }),

          $individualSession.messages.$get({
            param: { id: sessionId },
            query: {
              harnessId: undefined,
            },
          }),

          $individualSession.status.$get({
            param: { id: sessionId },
            query: {
              harnessId: undefined,
            },
          }),
        ]);

        if (cancelled) {
          return;
        }

        if (!sessionRes.ok) {
          if (sessionRes.status === 500) {
            removeRunningSession(sessionId);
          }
          throw new Error(apiError('failedToLoadSession'));
        }

        if (!messagesRes.ok) {
          throw new Error(apiError('failedToLoadSessionMessages'));
        }

        if (!statusRes.ok) {
          throw new Error(apiError('failedToLoadSessionStatus'));
        }

        const session = await sessionRes.json();
        const turns = await messagesRes.json();
        const statusResponse = await statusRes.json();

        const status = statusResponse[sessionId];

        /**
         * The persisted runningSessions list is only a hint.
         *
         * The server is the source of truth.
         *
         * If the session isn't actually busy anymore, don't
         * reconnect its stream.
         */
        if (!status || status.type !== 'busy') {
          removeRunningSession(sessionId);
          addUnreadSession(
            sessionId,
            status.type === 'idle' ? 'success' : 'error',
          );
          return;
        }

        const store = useChatStore.getState();

        /**
         * Same hydration pipeline as SessionPage.
         */
        store.setConversationData(sessionId, turns, session?.revert?.messageID);

        /**
         * Same status pipeline as SessionPage.
         */
        store.setStatus(sessionId, status, 'query');

        /**
         * IMPORTANT:
         *
         * Hydration + status happen BEFORE ensure().
         *
         * This means any streamed events arriving immediately
         * after ensure() have an already-hydrated runtime to
         * apply themselves to.
         */
        await sessionStreamManager.ensure({
          sessionId,
          harnessId: undefined,
        });
      } catch (error) {
        console.error(
          `[restore-session-streams] failed to restore ${sessionId}`,
          error,
        );
      }
    };

    const restore = async () => {
      await Promise.all(
        runningSessions.map((sessionId) => restoreSession(sessionId)),
      );
    };

    void restore();

    return () => {
      cancelled = true;
    };
  }, []);
}

/**
 * Collect session ids from every cached merged-sessions page.
 */
function collectSessionIds(queryClient: QueryClient): string[] {
  const ids = new Set<string>();

  for (const query of queryClient.getQueryCache().getAll()) {
    const key = query.queryKey;

    if (!Array.isArray(key) || key[0] !== 'sessions' || key[1] !== 'default') {
      continue;
    }

    const data = query.state.data as
      | { pages?: Array<{ items?: Array<{ id?: string }> }> }
      | undefined;

    if (!data?.pages) {
      continue;
    }

    for (const page of data.pages) {
      for (const item of page.items ?? []) {
        if (item?.id) ids.add(item.id);
      }
    }
  }

  return [...ids];
}

async function ensureSessionStream(sessionId: string) {
  try {
    const res = await $individualSession.status.$get({
      param: { id: sessionId },
      query: { harnessId: undefined },
    });

    if (res.ok) {
      const statuses = (await res.json()) as Record<string, AeroSessionStatus>;
      const status = statuses[sessionId];

      // Seed the live status so a session the agent just created shows its
      // working indicator immediately, before the first streamed status event.
      if (status && status.type !== 'idle') {
        useChatStore.getState().setStatus(sessionId, status, 'query');
      }
    }
  } catch {
    // Non-fatal: the stream below still delivers future status events.
  }

  void sessionStreamManager.ensure({ sessionId });
}

/**
 * Ensure a stream for every session that newly appears in the sessions list —
 * including sessions created server-side by the `aero` tool, which never go
 * through the frontend's create-session mutation. Sessions present at mount are
 * seeded without a stream so history is not opened all at once.
 */
export function useEnsureSessionStreams() {
  const queryClient = useQueryClient();
  const seen = useRef<Set<string>>(new Set());
  const initialized = useRef(false);

  useEffect(() => {
    const sync = () => {
      const ids = collectSessionIds(queryClient);

      if (!initialized.current) {
        // Seed the first non-empty list without opening a stream for every
        // historical session; only sessions that appear afterwards are new.
        for (const id of ids) seen.current.add(id);
        if (ids.length > 0) initialized.current = true;
        return;
      }

      for (const id of ids) {
        if (seen.current.has(id)) continue;
        seen.current.add(id);
        void ensureSessionStream(id);
      }
    };

    sync();

    return queryClient.getQueryCache().subscribe(sync);
  }, [queryClient]);
}
