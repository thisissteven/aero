import { useEffect } from 'react';
import {
  useChatStore,
  useSessionRuntime,
} from '@/app/features/chat-page/chat-feed/chat-store';
import {
  useSession,
  useSessionMessages,
  useSessionStatus,
} from '@/app/hooks/api/sessions';
import { useSessionStream } from '@/app/hooks/api/stream-event';

export function useSessionPage(sessionId: string) {
  const { data: session, isLoading: isSessionLoading } = useSession(
    undefined,
    sessionId,
  );

  const { data: queriedTurns = [], isLoading: isMessagesLoading } =
    useSessionMessages(undefined, sessionId);

  const setActiveSession = useChatStore((state) => state.setActiveSession);

  const removeUnreadSession = useChatStore(
    (state) => state.removeUnreadSession,
  );

  const setConversationData = useChatStore(
    (state) => state.setConversationData,
  );

  const setStatus = useChatStore((state) => state.setStatus);

  const turns = useSessionRuntime(sessionId, (runtime) => runtime.turns);

  /**
   * This replaces the old reset().
   *
   * We are changing the active view, NOT destroying
   * the session's runtime.
   */
  useEffect(() => {
    setActiveSession(sessionId, session?.revert?.messageID);
    /**
     * Changing the active view also marks the session as read.
     */
    removeUnreadSession(sessionId);
  }, [
    sessionId,
    session?.revert?.messageID,
    setActiveSession,
    removeUnreadSession,
  ]);

  // const { data: keys } = useWorkspacesKeys();

  // useEffect(() => {}, [sessionId, keys]);

  /**
   * Hydrate persisted messages once.
   *
   * The global store prevents this from overwriting
   * a live session that already has streamed data.
   */
  useEffect(() => {
    if (isMessagesLoading) {
      return;
    }

    setConversationData(sessionId, queriedTurns, session?.revert?.messageID);
  }, [
    sessionId,
    isMessagesLoading,
    queriedTurns,
    session?.revert?.messageID,
    setConversationData,
  ]);

  const { data: sessionStatus } = useSessionStatus(undefined, sessionId);

  useEffect(() => {
    const status = sessionStatus?.[sessionId];

    if (!status) {
      return;
    }

    setStatus(sessionId, status, 'query');
  }, [sessionStatus, sessionId, setStatus]);

  /**
   * The stream is now application-scoped.
   *
   * enabled/loading state must NOT control its lifetime.
   */
  useSessionStream({
    sessionId,
    harnessId: undefined,
  });

  const notFound = !session && !isSessionLoading;

  return {
    session,
    turns,
    notFound,
  };
}
