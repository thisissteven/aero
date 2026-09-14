import { createFileRoute } from '@tanstack/react-router';
import { SessionPage } from '@/app/features/new-session-page/session-page';

export const Route = createFileRoute('/_app/sessions/$sessionId')({
  component: SessionPage,
});
