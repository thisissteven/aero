import { createFileRoute, Outlet } from '@tanstack/react-router';

import { ChatShell } from '@/components/chat-shell';

export const Route = createFileRoute('/_app')({
  component: AppLayout,
});

function AppLayout() {
  return (
    <ChatShell>
      <Outlet />
    </ChatShell>
  );
}
