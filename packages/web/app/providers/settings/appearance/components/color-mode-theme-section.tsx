// components/color-mode-theme-section.tsx
import { Typography } from '@aero/ui';

import { useAppearanceStore } from '@/app/providers/settings/appearance/appearance-store';
import { ThemeSelect } from '@/app/providers/settings/appearance/components/theme-select';

import { ColorModeRadioGroup } from './color-mode-radio-group';
import { ReloadThemesButton } from './reload-themes-button';

function LightThemeSelect() {
  const lightTheme = useAppearanceStore((s) => s.lightTheme);
  const setLightTheme = useAppearanceStore((s) => s.setLightTheme);

  return (
    <ThemeSelect
      label='Light Theme'
      value={lightTheme}
      onChange={setLightTheme}
      placeholder='Select light theme'
    />
  );
}

function DarkThemeSelect() {
  const darkTheme = useAppearanceStore((s) => s.darkTheme);
  const setDarkTheme = useAppearanceStore((s) => s.setDarkTheme);

  return (
    <ThemeSelect
      label='Dark Theme'
      value={darkTheme}
      onChange={setDarkTheme}
      placeholder='Select dark theme'
    />
  );
}

export function ColorModeThemeSection() {
  return (
    <section className='space-y-6'>
      <Typography type='h6'>Color Mode & Theme</Typography>

      <div className='grid grid-cols-1 items-start gap-8 md:grid-cols-2'>
        <ColorModeRadioGroup />

        <div className='w-[220px] space-y-4'>
          <LightThemeSelect />
          <DarkThemeSelect />
          <ReloadThemesButton />
        </div>
      </div>
    </section>
  );
}
