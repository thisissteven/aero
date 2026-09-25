import { useState } from 'react';
import { ChatPage } from '@/app/features/chat-page';
import { ModelAgentDropdownSheet } from '@/app/features/chat-page/chat-input/models/model-agent/model-agent-dropdown';
import { useSessionPage } from '@/app/features/new-session-page/use-session-page';
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
