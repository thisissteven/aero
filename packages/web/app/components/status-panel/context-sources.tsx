import { Layers } from '@gravity-ui/icons';

import { Typography } from '@aero/ui';

export function ContextSources() {
  return (
    <div className='p-3'>
      <div className='mb-2.5 flex cursor-pointer items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Layers className='text-muted h-4 w-4' />
          <Typography type='body-sm' className='text-foreground font-semibold'>
            Context sources
          </Typography>
        </div>
        <Typography type='body-xs' className='text-muted'>
          7 skills
        </Typography>
      </div>
      <div className='flex flex-col gap-1.5'>
        <div className='flex items-center justify-between'>
          <Typography type='body-xs' color='muted'>
            Skills
          </Typography>
          <Typography type='body-xs' className='text-foreground font-mono'>
            7
          </Typography>
        </div>
        <div className='flex items-center justify-between'>
          <Typography type='body-xs' color='muted'>
            MCP servers
          </Typography>
          <Typography type='body-xs' className='text-foreground font-mono'>
            0
          </Typography>
        </div>
      </div>
    </div>
  );
}
