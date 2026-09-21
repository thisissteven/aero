import { toast } from '@aero/ui';
import { QueryClient } from '@tanstack/react-query';
import { $individualSession, sessionKeys } from '@/app/hooks/api/sessions';

export async function restoreAllMessages({
  queryClient,
  harnessId,
  sessionId,
}: {
  queryClient: QueryClient;
  harnessId: string | undefined;
  sessionId: string;
}) {
  const res = await $individualSession.restore.$post({
    param: { id: sessionId },
    query: { harnessId },
  });
  if (!res.ok) throw new Error('Failed to restore messages');
  const data = await res.json();
  queryClient.invalidateQueries({
    queryKey: sessionKeys.detail(harnessId, sessionId),
  });
  queryClient.invalidateQueries({
    queryKey: sessionKeys.toc(harnessId, sessionId),
  });
  return data;
}

export function restoreAllMessagesToast(fn: () => Promise<unknown>) {
  toast.promise(fn, {
    loading: 'Restoring messages...',
    error: (err) => err.message,
    success: 'Messages restored successfully',
  });
}
