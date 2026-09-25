// components/color-mode-theme-section.tsx
import { Typography } from '@aero/ui';

import { useI18n } from '@/app/hooks/i18n';
import { useAppearanceStore } from '@/app/providers/settings/appearance/appearance-store';
import { ThemeSelect } from '@/app/providers/settings/appearance/components/theme-select';

import { ColorModeRadioGroup } from './color-mode-radio-group';
import { ReloadThemesButton } from './reload-themes-button';

function LightThemeSelect() {
  const lightTheme = useAppearanceStore((s) => s.lightTheme);
  const setLightTheme = useAppearanceStore((s) => s.setLightTheme);
  const { t } = useI18n();

  return (
    <ThemeSelect
      label={t.settingsAppearance.lightTheme}
      value={lightTheme}
      onChange={setLightTheme}
      placeholder={t.settingsAppearance.selectLightTheme}
    />
  );
}

function DarkThemeSelect() {
  const darkTheme = useAppearanceStore((s) => s.darkTheme);
  const setDarkTheme = useAppearanceStore((s) => s.setDarkTheme);
  const { t } = useI18n();

  return (
    <ThemeSelect
      label={t.settingsAppearance.darkTheme}
      value={darkTheme}
      onChange={setDarkTheme}
      placeholder={t.settingsAppearance.selectDarkTheme}
    />
  );
}

export function ColorModeThemeSection() {
  const { t } = useI18n();

  return (
    <section className='space-y-6'>
      <Typography type='h6'>
        {t.settingsAppearance.colorModeAndTheme}
      </Typography>

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
