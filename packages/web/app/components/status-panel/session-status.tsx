import { Sliders } from '@gravity-ui/icons';
import { useParams } from '@tanstack/react-router';

import { ProgressBar, Typography } from '@aero/ui';

import { useSessionContext } from '@/app/hooks/api/sessions';

export function SessionStatus() {
  const { sessionId } = useParams({
    strict: false,
  });

  const { data } = useSessionContext(undefined, sessionId);

  const percentage = Math.round(data?.context?.usedPercentage ?? 0);

  return (
    <div className='border-separator border-b p-3'>
      <div className='mb-2 flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Typography type='body-sm' className='text-foreground font-semibold'>
            Session
          </Typography>
        </div>
        <Sliders className='text-muted hover:text-foreground h-3.5 w-3.5 cursor-pointer' />
      </div>
      <div className='mb-1.5 flex items-center justify-between'>
        <Typography type='body-xs' color='muted'>
          Context
        </Typography>
        <Typography type='body-xs' className='text-muted font-mono'>
          {percentage}%
        </Typography>
      </div>

      <ProgressBar
        aria-label='Context usage'
        className='w-full'
        minValue={0}
        maxValue={100}
        value={Math.min(100, Math.max(0, percentage))}
      >
        <ProgressBar.Track className='h-1.5'>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
    </div>
  );
}
