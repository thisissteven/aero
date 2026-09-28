import { useEffect } from 'react';

import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { useSessionMessages, useSessionStatus } from '@/app/hooks/api/sessions';
import { useSessionStream } from '@/app/hooks/api/stream-event';

/**
 * Hydrate a child (subagent) session into the chat store and keep its
 * stream open while `enabled`.
 *
 * Mirrors the hydration -> status -> stream order used by
 * `useRestoreSessionStreams`, but WITHOUT `setActiveSession` so opening an
 * inline subagent tool never hijacks the active session.
 *
 * `setConversationData` no-ops once hydrated and `setStatus` defers to a
 * live status, so repeated mounts are cheap and never clobber stream data.
 */
export function useSubagentStream(
  sessionId: string | undefined,
  enabled: boolean,
) {
  const { data: queriedTurns = [], isLoading: isMessagesLoading } =
    useSessionMessages(undefined, sessionId ?? '');

  const setConversationData = useChatStore(
    (state) => state.setConversationData,
  );
  const setStatus = useChatStore((state) => state.setStatus);

  useEffect(() => {
    if (!sessionId || !enabled || isMessagesLoading) {
      return;
    }

    setConversationData(sessionId, queriedTurns);
  }, [
    sessionId,
    enabled,
    isMessagesLoading,
    queriedTurns,
    setConversationData,
  ]);

  const { data: sessionStatus } = useSessionStatus(undefined, sessionId ?? '');

  useEffect(() => {
    if (!sessionId || !enabled) {
      return;
    }

    const status = sessionStatus?.[sessionId];

    if (!status) {
      return;
    }

    setStatus(sessionId, status, 'query');
  }, [sessionId, enabled, sessionStatus, setStatus]);

  useSessionStream({
    sessionId: enabled ? (sessionId ?? '') : '',
    harnessId: undefined,
  });

  return { isMessagesLoading };
}
