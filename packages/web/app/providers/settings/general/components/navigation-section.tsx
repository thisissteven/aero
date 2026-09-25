// components/navigation-section.tsx
import {
  Checkbox,
  Label,
  ListBox,
  Radio,
  RadioGroup,
  Select,
  Typography,
} from '@aero/ui';

import { useI18n } from '@/app/hooks/i18n';
import { KeymapOption, useGeneralStore } from '../general-store';
import { InfoTooltip } from './info-tooltip';

export function NavigationSection() {
  const { t } = useI18n();

  return (
    <section className='space-y-6'>
      <Typography type='h6'>{t.settingsGeneral.navigation}</Typography>

      <KeymapRadioGroup />

      <div className='space-y-3'>
        <AutoSaveCheckbox />
        <AlwaysShowToolbarCheckbox />
        <TerminalQuickKeysCheckbox />
      </div>

      <TerminalShellSelect />
    </section>
  );
}

function KeymapRadioGroup() {
  const keymap = useGeneralStore((s) => s.keymap);
  const setKeymap = useGeneralStore((s) => s.setKeymap);
  const { t } = useI18n();

  return (
    <div className='space-y-2'>
      <Label>{t.settingsGeneral.fileEditorKeymap}</Label>
      <RadioGroup
        value={keymap}
        onChange={(val) => setKeymap(val as KeymapOption)}
      >
        <Radio value='default'>
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            {t.settingsGeneral.keymapDefault}
          </Radio.Content>
        </Radio>
        <Radio value='vim'>
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            {t.settingsGeneral.keymapVim}
          </Radio.Content>
        </Radio>
      </RadioGroup>
    </div>
  );
}

function AutoSaveCheckbox() {
  const autoSave = useGeneralStore((s) => s.autoSave);
  const setAutoSave = useGeneralStore((s) => s.setAutoSave);
  const { t } = useI18n();

  return (
    <div className='flex items-center gap-2'>
      <Checkbox isSelected={autoSave} onChange={setAutoSave}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          {t.settingsGeneral.autoSaveFiles}
        </Checkbox.Content>
      </Checkbox>
      <InfoTooltip>{t.settingsGeneral.autoSaveFilesTooltip}</InfoTooltip>
    </div>
  );
}

function AlwaysShowToolbarCheckbox() {
  const alwaysShowToolbar = useGeneralStore((s) => s.alwaysShowToolbar);
  const setAlwaysShowToolbar = useGeneralStore((s) => s.setAlwaysShowToolbar);
  const { t } = useI18n();

  return (
    <Checkbox isSelected={alwaysShowToolbar} onChange={setAlwaysShowToolbar}>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        {t.settingsGeneral.alwaysShowEditorToolbar}
      </Checkbox.Content>
    </Checkbox>
  );
}

function TerminalQuickKeysCheckbox() {
  const terminalQuickKeys = useGeneralStore((s) => s.terminalQuickKeys);
  const setTerminalQuickKeys = useGeneralStore((s) => s.setTerminalQuickKeys);
  const { t } = useI18n();

  return (
    <div className='flex items-center gap-2'>
      <Checkbox isSelected={terminalQuickKeys} onChange={setTerminalQuickKeys}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          {t.settingsGeneral.terminalQuickKeys}
        </Checkbox.Content>
      </Checkbox>
      <InfoTooltip>{t.settingsGeneral.terminalQuickKeysTooltip}</InfoTooltip>
    </div>
  );
}

function TerminalShellSelect() {
  const terminalShell = useGeneralStore((s) => s.terminalShell);
  const setTerminalShell = useGeneralStore((s) => s.setTerminalShell);
  const { t } = useI18n();

  return (
    <div className='flex w-[220px] flex-col gap-2'>
      <div className='flex items-center gap-1.5'>
        <Label>{t.settingsGeneral.terminalShell}</Label>
        <InfoTooltip>{t.settingsGeneral.terminalShellTooltip}</InfoTooltip>
      </div>
      <Select
        value={terminalShell}
        onChange={(key) => setTerminalShell(key as string)}
        className='flex w-[220px] flex-col gap-2'
      >
        <Select.Trigger>
          <Select.Value />
          <Select.Indicator />
        </Select.Trigger>
        <Select.Popover className='rounded-xl'>
          <ListBox>
            <ListBox.Item id='auto' className='rounded-lg'>
              <Label>{t.settingsGeneral.shellAuto}</Label>
            </ListBox.Item>
            <ListBox.Item id='bash' className='rounded-lg'>
              <Label>{t.settingsGeneral.shellBash}</Label>
            </ListBox.Item>
            <ListBox.Item id='zsh' className='rounded-lg'>
              <Label>{t.settingsGeneral.shellZsh}</Label>
            </ListBox.Item>
            <ListBox.Item id='powershell' className='rounded-lg'>
              <Label>{t.settingsGeneral.shellPowershell}</Label>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
