import { toast } from '@aero/ui';
import { QueryClient } from '@tanstack/react-query';
import { $individualSession, sessionKeys } from '@/app/hooks/api/sessions';

export async function revertSession({
  queryClient,
  harnessId,
  sessionId,
  messageId,
}: {
  queryClient: QueryClient;
  harnessId: string | undefined;
  sessionId: string;
  messageId: string;
}) {
  const res = await $individualSession.revert.$post({
    param: { id: sessionId },
    query: { harnessId },
    json: { messageId },
  });
  if (!res.ok) throw new Error('Failed to revert message');
  const data = await res.json();
  queryClient.invalidateQueries({
    queryKey: sessionKeys.detail(harnessId, sessionId),
  });
  queryClient.invalidateQueries({
    queryKey: sessionKeys.toc(undefined, sessionId),
  });
  return data;
}

export function revertSessionToast(fn: () => Promise<unknown>) {
  toast.promise(fn, {
    loading: 'Reverting message',
    error: (err) => err.message,
    success: 'Message reverted successfully',
  });
}
