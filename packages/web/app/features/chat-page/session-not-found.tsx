import { Button, Spinner } from '@aero/ui';
import { useState } from 'react';
import { useSession } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';

export function SessionNotFound({ sessionId }: { sessionId: string }) {
  const [isPending, setisPending] = useState(false);
  const { t } = useI18n();
  const { refetch } = useSession(undefined, sessionId);

  return (
    <div className='grid h-full w-full place-items-center'>
      <div className='grid place-items-center gap-2'>
        <div className='text-muted text-sm'>{t.chatFeed.anErrorOccurred}</div>
        <Button
          onPress={async () => {
            try {
              setisPending(true);
              await refetch();
            } finally {
              setisPending(false);
            }
          }}
          isPending={isPending}
        >
          {({ isPending }) => (
            <>
              {isPending ? <Spinner color='current' size='sm' /> : null}
              {isPending ? t.common.retrying : t.common.retry}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
