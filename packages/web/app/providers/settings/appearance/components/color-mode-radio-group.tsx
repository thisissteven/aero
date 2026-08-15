// components/color-mode-radio-group.tsx
import { Description, Radio, RadioGroup } from '@aero/ui';

import { Theme, useTheme } from '@/app/providers/theme';

const MODE_OPTIONS: { value: Theme; label: string }[] = [
  { value: 'system', label: 'System' },
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
];

export function ColorModeRadioGroup() {
  const { theme, resolvedTheme, setTheme } = useTheme();

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
            {mode.label}
          </Radio.Content>
          {mode.value === 'system' && (
            <Description>Currently active: {resolvedTheme}</Description>
          )}
        </Radio>
      ))}
    </RadioGroup>
  );
}
