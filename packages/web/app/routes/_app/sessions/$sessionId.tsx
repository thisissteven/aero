import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect } from 'react';

import { ChatPage } from '@/app/features/chat-page';
import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
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

  const turns = useChatStore((state) => state.turns);

  const setConversationData = useChatStore(
    (state) => state.setConversationData,
  );

  const setStatus = useChatStore((state) => state.setStatus);

  const reset = useChatStore((state) => state.reset);

  useEffect(() => {
    reset();
  }, [sessionId, reset]);

  useEffect(() => {
    if (isMessagesLoading) {
      return;
    }

    setConversationData(queriedTurns, session?.revert?.messageID);
  }, [
    isMessagesLoading,
    queriedTurns,
    session?.revert?.messageID,
    setConversationData,
  ]);

  const { data: sessionStatus } = useSessionStatus(
    undefined,
    session?.workspace ?? '',
  );

  useEffect(() => {
    const status = sessionStatus?.[sessionId];

    if (status) {
      setStatus(status);
    }
  }, [sessionStatus, sessionId, setStatus]);

  const onStreamEvent = useCallback(
    (
      event: Parameters<
        ReturnType<typeof useChatStore.getState>['handleStreamEvent']
      >[0],
    ) => {
      useChatStore
        .getState()
        .handleStreamEvent(event, session?.revert?.messageID);
    },
    [session?.revert?.messageID],
  );

  useSessionStream({
    sessionId,
    harnessId: undefined,
    enabled: !isSessionLoading && !isMessagesLoading,
    onEvent: onStreamEvent,
  });

  const notFound = !session && !isSessionLoading;

  return (
    <ChatPage
      sessionId={sessionId}
      workspace={session?.workspace}
      revertMessageId={session?.revert?.messageID}
      groups={turns}
      notFound={notFound}
    />
  );
}
