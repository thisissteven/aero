import { useState } from 'react';

import { Button, Spinner } from '@aero/ui';

import { useSession } from '@/app/hooks/api/sessions';

export function SessionNotFound({ sessionId }: { sessionId: string }) {
  const [isPending, setisPending] = useState(false);
  const { refetch } = useSession(undefined, sessionId);

  return (
    <div className='grid h-full w-full place-items-center'>
      <div className='grid place-items-center gap-2'>
        <div className='text-muted text-sm'>Session not found.</div>
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
              {isPending ? 'Retrying...' : 'Retry'}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
