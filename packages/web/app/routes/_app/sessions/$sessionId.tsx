import { createFileRoute } from '@tanstack/react-router';

import { ChatPage } from '@/app/features/chat-page';
import { useSession, useSessionMessages } from '@/app/hooks/api/sessions';

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

  return <ChatPage groups={turns} notFound={notFound} />;
}
