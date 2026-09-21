import { sessionKeys } from '@/app/hooks/api/sessions';
import { queryClient } from '@/app/providers';
import { AeroSessionSummary } from '@/server/services/harness/types';

export function handleSessionUpdated(updatedSession: AeroSessionSummary) {
  queryClient.invalidateQueries({
    queryKey: sessionKeys.detail(undefined, updatedSession.id),
  });

  const directory = updatedSession.workspace;

  queryClient.invalidateQueries({
    queryKey: [
      ...sessionKeys.merged(),
      undefined,
      ...(directory ? ['directory', directory] : []),
      undefined,
      undefined,
    ],
  });

  queryClient.invalidateQueries({
    queryKey: [...sessionKeys.merged(), undefined, undefined, undefined],
    exact: true,
  });

  queryClient.invalidateQueries({
    queryKey: sessionKeys.context(undefined, updatedSession.id),
  });
}
