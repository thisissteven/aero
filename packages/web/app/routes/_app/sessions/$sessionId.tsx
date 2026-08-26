import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect } from 'react';

import { ChatPage } from '@/app/features/chat-page';
import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { useSession, useSessionMessages } from '@/app/hooks/api/sessions';
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

  const { data: turns = [] } = useSessionMessages(undefined, sessionId);

  const notFound = !session && !isSessionLoading;

  const setConversationData = useChatStore(
    (state) => state.setConversationData,
  );

  useEffect(() => {
    setConversationData(turns, session?.revert?.messageID);
  }, [turns, session?.revert?.messageID, setConversationData]);

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
    onEvent: onStreamEvent,
  });

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
