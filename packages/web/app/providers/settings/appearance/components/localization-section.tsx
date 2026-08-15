// components/localization-section.tsx
import { Label, ListBox, Select, Typography } from '@aero/ui';

import { useAppearanceStore } from '../appearance-store';

export function LocalizationSection() {
  return (
    <section className='space-y-6'>
      <div>
        <Typography type='h6'>Localization</Typography>
        <Typography type='body-sm' color='muted' className='mt-0.5'>
          Language, time formats, and regional settings.
        </Typography>
      </div>

      <div className='grid grid-cols-1 gap-8 md:grid-cols-2'>
        <div>
          <LanguageSelect />
        </div>

        <div className='space-y-4'>
          <TimeFormatSelect />
          <WeekStartsOnSelect />
        </div>
      </div>
    </section>
  );
}

function LanguageSelect() {
  const language = useAppearanceStore((s) => s.language);
  const setLanguage = useAppearanceStore((s) => s.setLanguage);

  return (
    <Select
      value={language}
      onChange={(key) => setLanguage(key as string)}
      className='flex w-[220px] flex-col gap-2'
    >
      <Label>Language</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id='en'>
            <Label>English (US)</Label>
          </ListBox.Item>
          <ListBox.Item id='en-gb'>
            <Label>English (UK)</Label>
          </ListBox.Item>
          <ListBox.Item id='es'>
            <Label>Español</Label>
          </ListBox.Item>
          <ListBox.Item id='fr'>
            <Label>Français</Label>
          </ListBox.Item>
          <ListBox.Item id='de'>
            <Label>Deutsch</Label>
          </ListBox.Item>
          <ListBox.Item id='ja'>
            <Label>日本語</Label>
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function TimeFormatSelect() {
  const timeFormat = useAppearanceStore((s) => s.timeFormat);
  const setTimeFormat = useAppearanceStore((s) => s.setTimeFormat);

  return (
    <Select
      value={timeFormat}
      onChange={(key) => setTimeFormat(key as string)}
      className='flex w-[220px] flex-col gap-2'
    >
      <Label>Time Format</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id='auto'>
            <Label>Auto (System Default)</Label>
          </ListBox.Item>
          <ListBox.Item id='12h'>
            <Label>12-hour (1:00 PM)</Label>
          </ListBox.Item>
          <ListBox.Item id='24h'>
            <Label>24-hour (13:00)</Label>
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function WeekStartsOnSelect() {
  const weekStartsOn = useAppearanceStore((s) => s.weekStartsOn);
  const setWeekStartsOn = useAppearanceStore((s) => s.setWeekStartsOn);

  return (
    <Select
      value={weekStartsOn}
      onChange={(key) => setWeekStartsOn(key as string)}
      className='flex w-[220px] flex-col gap-2'
    >
      <Label>Week Starts On</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover>
        <ListBox>
          <ListBox.Item id='auto'>
            <Label>Auto (System Default)</Label>
          </ListBox.Item>
          <ListBox.Item id='sunday'>
            <Label>Sunday</Label>
          </ListBox.Item>
          <ListBox.Item id='monday'>
            <Label>Monday</Label>
          </ListBox.Item>
          <ListBox.Item id='saturday'>
            <Label>Saturday</Label>
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
