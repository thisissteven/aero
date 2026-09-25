// appearance-view.tsx
import { Separator, Typography } from '@aero/ui';

import { useI18n } from '@/app/hooks/i18n';
import { useResolvedThemeSync } from '@/app/hooks/useResolvedTheme';

import { ColorModeThemeSection } from './components/color-mode-theme-section';
import { LocalizationSection } from './components/localization-section';
import { WindowControlsSection } from './components/window-controls-section';

export function AppearanceView() {
  useResolvedThemeSync();
  const { t } = useI18n();

  return (
    <div className='bg-background max-w-4xl flex-1 scrollbar-thin space-y-8 overflow-y-auto p-8'>
      <div>
        <Typography type='h3' weight='semibold'>
          {t.settingsAppearance.appearance}
        </Typography>
        <Typography type='body-sm' color='muted'>
          {t.settingsAppearance.subtitle}
        </Typography>
      </div>

      <Separator />
      <ColorModeThemeSection />
      <Separator />
      <WindowControlsSection />
      <Separator />
      <LocalizationSection />
    </div>
  );
}
