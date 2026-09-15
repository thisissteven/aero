// components/reload-themes-button.tsx

import { Button, Tooltip, Typography } from '@aero/ui';
import { ArrowsRotateRight, CircleInfo } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';
import { InfoTooltip } from '@/app/providers/settings/general/components/info-tooltip';

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

      <InfoTooltip>Reload custom theme from ~/.config/aero/themes</InfoTooltip>
    </div>
  );
}
