import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useState } from 'react';

import { ChatPage } from '@/app/features/chat-page';
import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { ModelAgentDropdownSheet } from '@/app/features/chat-page/chat-input/model-agent-dropdown';
import {
  useSession,
  useSessionMessages,
  useSessionStatus,
} from '@/app/hooks/api/sessions';
import { useSessionStream } from '@/app/hooks/api/stream-event';

export const Route = createFileRoute('/_app/sessions/$sessionId')({
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();

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

  const turns = useChatStore((state) => state.turns);

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

  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  return (
    <div ref={setContainer} className='relative h-full overflow-hidden'>
      {container && <ModelAgentDropdownSheet container={container} />}
      <ChatPage
        sessionId={sessionId}
        workspace={session?.workspace}
        groups={turns}
        notFound={notFound}
      />
    </div>
  );
}
