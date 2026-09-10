import { ArrowsRotateRight, Clock } from '@gravity-ui/icons';

import { Typography } from '@aero/ui';

export function UsageStatus() {
  return (
    <div className='border-separator border-b p-3'>
      <div className='mb-2 flex cursor-pointer items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Clock className='text-muted h-4 w-4' />
          <Typography type='body-sm' className='text-foreground font-semibold'>
            Usage
          </Typography>
        </div>
        <div className='text-muted flex items-center gap-1.5'>
          <span className='text-xs'>Used</span>
          <ArrowsRotateRight className='hover:text-foreground h-3 w-3 cursor-pointer' />
        </div>
      </div>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='bg-accent h-2 w-2 rounded-full' />
          <Typography type='body-sm' className='text-foreground font-medium'>
            OpenRouter
          </Typography>
        </div>
        <Typography type='body-xs' className='text-danger font-medium'>
          fetch failed
        </Typography>
      </div>
    </div>
  );
}
