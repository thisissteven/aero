// components/theme-select.tsx
import { Label, ListBox, Select } from '@aero/ui';

import { COLOR_THEMES, ColorTheme } from '@/app/providers/theme';

import { THEME_LABELS } from './theme-labels';

interface ThemeSelectProps {
  label: string;
  value: ColorTheme;
  onChange: (theme: ColorTheme) => void;
  placeholder?: string;
}

export function ThemeSelect({
  label,
  value,
  onChange,
  placeholder = 'Select theme',
}: ThemeSelectProps) {
  return (
    <Select
      value={value}
      onChange={(key) => onChange(key as ColorTheme)}
      placeholder={placeholder}
      className='flex w-[220px] flex-col gap-2'
    >
      <Label>{label}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className='rounded-xl'>
        <ListBox>
          {COLOR_THEMES.map((themeKey) => (
            <ListBox.Item className='rounded-lg' key={themeKey} id={themeKey}>
              <Label>{THEME_LABELS[themeKey]}</Label>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
