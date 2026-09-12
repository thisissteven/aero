// components/info-tooltip.tsx
import { CircleInfo } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Tooltip, Typography } from '@aero/ui';

export function InfoTooltip({ children }: { children: React.ReactNode }) {
  return (
    <Tooltip>
      <Tooltip.Trigger>
        <span className='text-muted/50 hover:text-foreground/80 transition'>
          <Icon data={CircleInfo} className='size-3.5' />
        </span>
      </Tooltip.Trigger>
      <Tooltip.Content offset={8}>
        <Typography type='body-xs'>{children}</Typography>
      </Tooltip.Content>
    </Tooltip>
  );
}
