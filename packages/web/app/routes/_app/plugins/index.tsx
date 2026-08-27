import { createFileRoute } from '@tanstack/react-router';

import { SessionChat } from '@/app/components/message-view/unused/standalone-session/standalone-session';

export const Route = createFileRoute('/_app/plugins/')({
  component: PluginsPage,
});

function PluginsPage() {
  return (
    <SessionChat
      sessionId='ses_fbcbffea0ffe51sdkr1LWTNUKh'
      directory='C:/Users/Steven/.aero/workspaces/82960e4c-7499-4482-ae0b-01260b22b799'
    />
  );
}
