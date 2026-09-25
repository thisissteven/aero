// components/reload-themes-button.tsx

import { Button, Typography } from '@aero/ui';
import { ArrowsRotateRight } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';
import { useI18n } from '@/app/hooks/i18n';
import { InfoTooltip } from '@/app/providers/settings/general/components/info-tooltip';

export function ReloadThemesButton() {
  const [isReloading, setIsReloading] = useState(false);
  const { t } = useI18n();

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
        <Typography type='body-xs'>
          {t.settingsAppearance.reloadThemes}
        </Typography>
      </Button>

      <InfoTooltip>{t.settingsAppearance.reloadThemesTooltip}</InfoTooltip>
    </div>
  );
}
