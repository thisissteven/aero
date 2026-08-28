import { useEffect, useRef } from 'react';

import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { $individualSession } from '@/app/hooks/api/sessions';
import { sessionStreamManager } from '@/app/services/session-stream-manager';

interface Params {
  sessionId: string;
  harnessId?: string;
}

export function useSessionStream({ sessionId, harnessId }: Params) {
  const isStreaming = useChatStore((state) =>
    sessionId ? (state.sessions[sessionId]?.isStreaming ?? false) : false,
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
          throw new Error('Failed to load session');
        }

        if (!messagesRes.ok) {
          throw new Error('Failed to load session messages');
        }

        if (!statusRes.ok) {
          throw new Error('Failed to load session status');
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
