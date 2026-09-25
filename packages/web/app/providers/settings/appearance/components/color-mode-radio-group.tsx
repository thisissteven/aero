// components/color-mode-radio-group.tsx
import { Description, Radio, RadioGroup } from '@aero/ui';

import { useI18n } from '@/app/hooks/i18n';
import { Theme, useTheme } from '@/app/providers/theme';

const MODE_OPTIONS: {
  value: Theme;
  labelKey: 'system' | 'light' | 'dark';
}[] = [
  { value: 'system', labelKey: 'system' },
  { value: 'light', labelKey: 'light' },
  { value: 'dark', labelKey: 'dark' },
];

export function ColorModeRadioGroup() {
  const { theme, resolvedTheme, setTheme } = useTheme();
  const { t } = useI18n();

  return (
    <RadioGroup value={theme} onChange={(val) => setTheme(val as Theme)}>
      {MODE_OPTIONS.map((mode) => (
        <Radio
          key={mode.value}
          value={mode.value}
          className='first-of-type:mt-0'
        >
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            {t.settingsAppearance[mode.labelKey]}
          </Radio.Content>
          {mode.value === 'system' && (
            <Description>
              {t.settingsAppearance.currentlyActive(resolvedTheme)}
            </Description>
          )}
        </Radio>
      ))}
    </RadioGroup>
  );
}
