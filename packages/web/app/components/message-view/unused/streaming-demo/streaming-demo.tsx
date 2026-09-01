import { useEffect, useState } from 'react';

import { getSessionStore } from '@/app/components/message-view/unused/streaming-demo/streaming-demo-store';
import { ChatPage } from '@/app/features/chat-page';
import { ModelAgentDropdownSheet } from '@/app/features/chat-page/chat-input/model-agent-dropdown';
import {
  useSession,
  useSessionMessages,
  useSessionStatus,
} from '@/app/hooks/api/sessions';
import { useSessionStream } from '@/app/hooks/api/stream-event';
import { Route } from '@/app/routes/_app/sessions/$sessionId';

export function StreamingDemo() {
  const { sessionId } = Route.useParams();

  const { data: session, isLoading: isSessionLoading } = useSession(
    undefined,
    sessionId,
  );

  const { data: queriedTurns = [], isLoading: isMessagesLoading } =
    useSessionMessages(undefined, sessionId);

  const { data: sessionStatus } = useSessionStatus(undefined, sessionId);

  useEffect(() => {
    const status = sessionStatus?.[sessionId];

    if (status) {
      const sessionStore = getSessionStore(sessionId);
      sessionStore.getState().setStatus(status);
    }
  }, [sessionId, sessionStatus]);

  useEffect(() => {
    if (isMessagesLoading || !session) return;

    const sessionStore = getSessionStore(sessionId);
    sessionStore
      .getState()
      .initFromMessages(queriedTurns, session.revert?.messageID);
  }, [session, queriedTurns, isMessagesLoading]);

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
        notFound={notFound}
      />
    </div>
  );
}
