import { createFileRoute } from '@tanstack/react-router';
import { SessionPage } from '@/app/features/session-page';

export const Route = createFileRoute('/_app/sessions/$sessionId')({
  component: SessionPage,
});
