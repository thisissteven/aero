// components/localization-section.tsx
import { Label, ListBox, Select, Typography } from '@aero/ui';

import { useI18n } from '@/app/hooks/i18n';
import { SupportedLanguage } from '@/app/hooks/i18n/locales/translations';
import { useAppearanceStore } from '../appearance-store';

const LANGUAGES: { id: SupportedLanguage; label: string }[] = [
  { id: 'en', label: 'English' },
  { id: 'zh', label: '简体中文' },
  { id: 'zh-TW', label: '繁體中文' },
  { id: 'es', label: 'Español' },
  { id: 'fr', label: 'Français' },
  { id: 'de', label: 'Deutsch' },
  { id: 'ja', label: '日本語' },
  { id: 'id', label: 'Bahasa Indonesia' },
];

export function LocalizationSection() {
  const { t } = useI18n();

  return (
    <section className='space-y-6'>
      <div>
        <Typography type='h6'>{t.settingsAppearance.localization}</Typography>
        <Typography type='body-sm' color='muted' className='mt-0.5'>
          {t.settingsAppearance.localizationSubtitle}
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
  const { t, language, setLanguage } = useI18n();

  return (
    <Select
      value={language}
      onChange={(key) => setLanguage(key as SupportedLanguage)}
      className='flex w-[220px] flex-col gap-2'
    >
      <Label>{t.settingsAppearance.language}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className='rounded-xl'>
        <ListBox>
          {LANGUAGES.map(({ id, label }) => (
            <ListBox.Item key={id} id={id} className='rounded-lg'>
              <Label>{label}</Label>
            </ListBox.Item>
          ))}
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function TimeFormatSelect() {
  const { t } = useI18n();
  const timeFormat = useAppearanceStore((s) => s.timeFormat);
  const setTimeFormat = useAppearanceStore((s) => s.setTimeFormat);

  return (
    <Select
      value={timeFormat}
      onChange={(key) => setTimeFormat(key as string)}
      className='flex w-[220px] flex-col gap-2'
    >
      <Label>{t.settingsAppearance.timeFormat}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className='rounded-xl'>
        <ListBox>
          <ListBox.Item id='auto' className='rounded-lg'>
            <Label>{t.settingsAppearance.timeAuto}</Label>
          </ListBox.Item>
          <ListBox.Item id='12h' className='rounded-lg'>
            <Label>{t.settingsAppearance.time12h}</Label>
          </ListBox.Item>
          <ListBox.Item id='24h' className='rounded-lg'>
            <Label>{t.settingsAppearance.time24h}</Label>
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}

function WeekStartsOnSelect() {
  const { t } = useI18n();
  const weekStartsOn = useAppearanceStore((s) => s.weekStartsOn);
  const setWeekStartsOn = useAppearanceStore((s) => s.setWeekStartsOn);

  return (
    <Select
      value={weekStartsOn}
      onChange={(key) => setWeekStartsOn(key as string)}
      className='flex w-[220px] flex-col gap-2'
    >
      <Label>{t.settingsAppearance.weekStartsOn}</Label>
      <Select.Trigger>
        <Select.Value />
        <Select.Indicator />
      </Select.Trigger>
      <Select.Popover className='rounded-xl'>
        <ListBox>
          <ListBox.Item id='auto' className='rounded-lg'>
            <Label>{t.settingsAppearance.timeAuto}</Label>
          </ListBox.Item>
          <ListBox.Item id='sunday' className='rounded-lg'>
            <Label>{t.settingsAppearance.sunday}</Label>
          </ListBox.Item>
          <ListBox.Item id='monday' className='rounded-lg'>
            <Label>{t.settingsAppearance.monday}</Label>
          </ListBox.Item>
          <ListBox.Item id='saturday' className='rounded-lg'>
            <Label>{t.settingsAppearance.saturday}</Label>
          </ListBox.Item>
        </ListBox>
      </Select.Popover>
    </Select>
  );
}
