import { toast } from '@aero/ui';
import { useNavigate } from '@tanstack/react-router';

import {
  useArchiveBulkSessions,
  useArchiveSession,
} from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { useSessionId } from '@/app/providers/SessionIdProvider';

export function useArchiveSessionAction() {
  const { mutateAsync } = useArchiveSession();

  const navigate = useNavigate();
  const currentSessionId = useSessionId();

  const { t } = useI18n();

  return (sessionId: string) => {
    toast.promise(mutateAsync(sessionId), {
      loading: t.session.archivingSession,
      error: (err) => err.message,
      success: (_data) => {
        if (currentSessionId === sessionId) {
          navigate({
            to: '/new',
          });
        }
        return t.session.sessionArchived;
      },
    });
  };
}

export function useArchiveBulkSessionsAction() {
  const { mutateAsync } = useArchiveBulkSessions();

  const navigate = useNavigate();
  const currentSessionId = useSessionId();

  const { t } = useI18n();

  return (sessionIds: string[]) => {
    toast.promise(mutateAsync(sessionIds), {
      loading: t.session.archivingSessions,
      error: (err) => err.message,
      success: (_data) => {
        if (currentSessionId && sessionIds.includes(currentSessionId)) {
          navigate({
            to: '/new',
          });
        }
        return t.session.sessionsArchived;
      },
    });
  };
}
