import { createFileRoute } from '@tanstack/react-router';

import { useSession } from '@/app/hooks/api/sessions';

export const Route = createFileRoute('/_app/plugins/$pluginId')({
  component: PluginPage,
});

function PluginPage() {
  const { pluginId: sessionId } = Route.useParams();

  const { data: session } = useSession(undefined, sessionId);

  if (!sessionId || !session) return null;

  return null;
}
