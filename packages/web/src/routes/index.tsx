import { createFileRoute, redirect } from '@tanstack/react-router';

import { DEFAULT_CHAT_THREAD_ID } from '@/data/chat';

export const Route = createFileRoute('/')({
  beforeLoad() {
    throw redirect({
      to: '/sessions/$sessionId',
      params: {
        sessionId: DEFAULT_CHAT_THREAD_ID,
      },
    });
  },
});
