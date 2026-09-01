import { createFileRoute } from '@tanstack/react-router';

import { StreamingDemo } from '@/app/components/message-view/unused/streaming-demo/streaming-demo';

export const Route = createFileRoute('/_app/sessions/$sessionId')({
  component: StreamingDemo,
});
