import { createFileRoute } from '@tanstack/react-router';

import { NewChatPage } from '@/app/features/new-chat-page';

export const Route = createFileRoute('/_app/new')({
  component: NewChatPage,
});
