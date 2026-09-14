// components/info-tooltip.tsx

import { Tooltip, Typography } from '@aero/ui';
import { CircleInfo } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

export function InfoTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <Tooltip.Trigger>
        <span className='max-sm:hidden text-muted/50 hover:text-foreground/80 transition'>
          <Icon data={CircleInfo} className='size-3.5' />
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content offset={8}>
        <Typography type='body-xs' className='leading-4'>
          {children}
        </Typography>
      </Tooltip.Content>
    </Tooltip>
  );
}
