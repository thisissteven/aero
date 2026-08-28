import { createFileRoute, Outlet } from '@tanstack/react-router';

import { ChatShell } from '@/app/components/chat-shell';
import { useRestoreSessionStreams } from '@/app/hooks/api/stream-event';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

function AppLayout() {
  useRestoreSessionStreams();
  return (
    <ChatShell>
      <Outlet />
    </ChatShell>
  );
}
