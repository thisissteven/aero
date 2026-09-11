import { ArrowsRotateRight, Clock } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Typography } from '@aero/ui';

import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function UsageStatus() {
  const isVisible = useStatusPanelStore((state) => state.visibleItems.usage);

  if (!isVisible) return null;

  return (
    <div className='border-separator dark:border-separator/70 border-b p-3'>
      <div className='mb-2 flex cursor-pointer items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Icon data={Clock} className='text-muted' size={14} />
          <Typography type='body-sm' className='text-foreground font-medium'>
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
