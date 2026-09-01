import { useEffect, useRef } from 'react';

import { useGlobalChatStore } from '@/app/components/message-view/unused/streaming-demo/global-chat-store';
import {
  getSessionStore,
  useChatStore,
} from '@/app/components/message-view/unused/streaming-demo/streaming-demo-store';
import { $individualSession } from '@/app/hooks/api/sessions';
import { sessionStreamManager } from '@/app/services/session-stream-manager';

interface Params {
  sessionId: string;
  harnessId?: string;
}

export function useSessionStream({ sessionId, harnessId }: Params) {
  const isStreaming = useChatStore(sessionId, (state) => state.isStreaming);

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

    const runningSessions = useGlobalChatStore.getState().runningSessions;
    const removeRunningSession =
      useGlobalChatStore.getState().removeRunningSession;
    const addUnreadSession = useGlobalChatStore.getState().addUnreadSession;

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

        const chatStore = getSessionStore(sessionId).getState();

        /**
         * Same hydration pipeline as SessionPage.
         */
        chatStore.initFromMessages(turns, session?.revert?.messageID);

        /**
         * Same status pipeline as SessionPage.
         */
        chatStore.setStatus(status);

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
