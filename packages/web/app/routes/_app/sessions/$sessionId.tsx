import { createFileRoute } from '@tanstack/react-router';

import { useSession, useSessionMessages } from '@/hooks/api/sessions';

import type { ChatThread } from '@/data/chat';

import { ChatPage } from '@/features/chat-page';

import type {
  AeroMessage,
  AeroPart,
} from '../../../../server/services/harness/types';

export const Route = createFileRoute('/_app/sessions/$sessionId')({
  component: SessionPage,
});

function SessionPage() {
  const { sessionId } = Route.useParams();

  // Fetch from backend
  const { data: session, isLoading: isSessionLoading } = useSession(
    undefined,
    sessionId,
  );
  const { data: messages = [], isLoading: isMessagesLoading } =
    useSessionMessages(undefined, sessionId);

  if (isSessionLoading || isMessagesLoading) {
    return (
      <div className='flex h-[calc(100svh-var(--chat-navbar-height,64px))] items-center justify-center'>
        <span className='text-muted text-sm'>Loading session...</span>
      </div>
    );
  }

  if (!session) {
    return (
      <div className='flex h-[calc(100svh-var(--chat-navbar-height,64px))] items-center justify-center'>
        <span className='text-muted text-sm'>Session not found.</span>
      </div>
    );
  }

  const lastMessageText = (messages as AeroMessage[])[
    messages.length - 1
  ]?.parts
    .filter(
      (p: AeroPart): p is Extract<AeroPart, { type: 'text' }> =>
        p.type === 'text',
    )
    .map((p) => p.text)
    .join(' ');

  const thread: ChatThread = {
    id: session.id,
    title: session.title || 'Untitled Session',
    preview: lastMessageText || 'No messages',
    updatedAt: new Date(session.updatedAt).toLocaleTimeString(),
    modelId: session.harness,
    searchModeId: 'quick-search',
    user: {
      avatar:
        'https://heroui-assets.nyc3.cdn.digitaloceanspaces.com/avatars/blue-light.jpg',
      email: 'darnell@email.com',
      name: 'Darnell Howe',
    },
    messages,
  };

  return <ChatPage thread={thread} />;
}
