import { useEffect, useState } from 'react';
import { ChatPage } from '@/app/features/chat-page';
import {
  useChatStore,
  useSessionRuntime,
} from '@/app/features/chat-page/chat-feed/chat-store';
import { ModelAgentDropdownSheet } from '@/app/features/chat-page/chat-input/model-agent-dropdown';
import { useSessionPage } from '@/app/features/new-session-page/use-session-page';
import {
  useSession,
  useSessionMessages,
  useSessionStatus,
} from '@/app/hooks/api/sessions';
import { useSessionStream } from '@/app/hooks/api/stream-event';
import { useSessionId } from '@/app/providers/SessionIdProvider';

export function SessionPage() {
  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const sessionId = useSessionId();

  const { session, turns, notFound } = useSessionPage(sessionId);

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
