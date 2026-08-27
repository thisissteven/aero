import { createFileRoute } from '@tanstack/react-router';

import { SessionChat } from '@/app/components/message-view/unused/standalone-session/standalone-session';
import { useSession } from '@/app/hooks/api/sessions';

export const Route = createFileRoute('/_app/plugins/$pluginId')({
  component: PluginPage,
});

function PluginPage() {
  const { pluginId: sessionId } = Route.useParams();

  const { data: session } = useSession(undefined, sessionId);

  if (!sessionId || !session) return null;

  return <SessionChat sessionId={sessionId} directory={session.workspace} />;
}
