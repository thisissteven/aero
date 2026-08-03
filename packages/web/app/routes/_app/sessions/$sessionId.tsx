import { createFileRoute } from '@tanstack/react-router';

import { getChatThread } from '@/data/chat';

import { ChatPage } from '@/features/chat-page';

export const Route = createFileRoute('/_app/sessions/$sessionId')({
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();

  const thread = getChatThread(sessionId);

  if (!thread) return null;

  return <ChatPage thread={thread} />;
}
