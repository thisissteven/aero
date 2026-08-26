import { createFileRoute } from '@tanstack/react-router';

import { NewSessionPage } from '@/app/features/new-session-page';

export const Route = createFileRoute('/_app/new')({
  component: NewSessionPage,
});
