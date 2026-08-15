// components/reload-themes-button.tsx
import { ArrowsRotateRight, CircleInfo } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import { Button, Tooltip, Typography } from '@aero/ui';

export function ReloadThemesButton() {
  const [isReloading, setIsReloading] = useState(false);

  const handleReloadThemes = () => {
    setIsReloading(true);
    setTimeout(() => setIsReloading(false), 600);
  };

  return (
    <div className='flex items-center gap-2 pt-2'>
      <Button
        variant='tertiary'
        size='sm'
        isPending={isReloading}
        onPress={handleReloadThemes}
        className='gap-1.5'
      >
        {!isReloading && <Icon data={ArrowsRotateRight} className='size-3.5' />}
        <Typography type='body-xs'>Reload themes</Typography>
      </Button>

      <Tooltip>
        <Tooltip.Trigger>
          <span className='text-muted hover:text-foreground cursor-pointer transition-colors'>
            <Icon data={CircleInfo} className='size-3.5' />
          </span>
        </Tooltip.Trigger>
        <Tooltip.Content offset={8}>
          <Typography type='body-xs'>
            Reload custom theme from ~/.config/aero/themes
          </Typography>
        </Tooltip.Content>
      </Tooltip>
    </div>
  );
}
