// appearance-view.tsx
import { Separator, Typography } from '@aero/ui';

import { useResolvedThemeSync } from '@/app/hooks/useResolvedTheme';

import { ColorModeThemeSection } from './components/color-mode-theme-section';
import { LocalizationSection } from './components/localization-section';
import { WindowControlsSection } from './components/window-controls-section';

export function AppearanceView() {
  useResolvedThemeSync();

  return (
    <div className='bg-background max-w-4xl flex-1 scrollbar-thin space-y-8 overflow-y-auto p-8'>
      <div>
        <Typography type='h3' weight='semibold'>
          Appearance
        </Typography>
        <Typography type='body-sm' color='muted'>
          Customize how Aero looks and feels across your workspace.
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
