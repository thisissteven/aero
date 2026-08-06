import { createFileRoute } from '@tanstack/react-router';

import { useSessionMessages } from '@/hooks/api/sessions';

import { ChatPage } from '@/features/chat-page';

export const Route = createFileRoute('/_app/sessions/$sessionId')({
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();

  const { data: turns = [], isLoading } = useSessionMessages(
    undefined,
    sessionId,
  );

  if (isLoading) {
    return null;
  }

  if (!turns && !isLoading) {
    return (
      <div className='flex h-[calc(100svh-var(--chat-navbar-height,64px))] items-center justify-center'>
        <span className='text-muted text-sm'>Session not found.</span>
      </div>
    );
  }

  return <ChatPage groups={turns} />;
}
