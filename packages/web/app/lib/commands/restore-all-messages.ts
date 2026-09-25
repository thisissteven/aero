import { toast } from '@aero/ui';
import { QueryClient } from '@tanstack/react-query';
import { $individualSession, sessionKeys } from '@/app/hooks/api/sessions';
import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';

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

export function restoreAllMessagesToast(
  fn: () => Promise<unknown>,
  t: BaseTranslation,
) {
  toast.promise(fn, {
    loading: t.toolCommand.restoringMessages,
    error: (err) => err.message,
    success: t.toolCommand.messagesRestored,
  });
}
