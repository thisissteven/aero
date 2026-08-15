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

import { InfoTooltip } from './info-tooltip';
import { KeymapOption, useGeneralStore } from '../general-store';

export function NavigationSection() {
  return (
    <section className='space-y-6'>
      <Typography type='h6'>Navigation</Typography>

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

  return (
    <div className='space-y-2'>
      <Label>File editor keymap</Label>
      <RadioGroup
        value={keymap}
        onChange={(val) => setKeymap(val as KeymapOption)}
      >
        <Radio value='default'>
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Default
          </Radio.Content>
        </Radio>
        <Radio value='vim'>
          <Radio.Content>
            <Radio.Control>
              <Radio.Indicator />
            </Radio.Control>
            Vim
          </Radio.Content>
        </Radio>
      </RadioGroup>
    </div>
  );
}

function AutoSaveCheckbox() {
  const autoSave = useGeneralStore((s) => s.autoSave);
  const setAutoSave = useGeneralStore((s) => s.setAutoSave);

  return (
    <div className='flex items-center gap-2'>
      <Checkbox isSelected={autoSave} onChange={setAutoSave}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Auto-save files
        </Checkbox.Content>
      </Checkbox>
      <InfoTooltip>Automatically save changes to disk on blur.</InfoTooltip>
    </div>
  );
}

function AlwaysShowToolbarCheckbox() {
  const alwaysShowToolbar = useGeneralStore((s) => s.alwaysShowToolbar);
  const setAlwaysShowToolbar = useGeneralStore((s) => s.setAlwaysShowToolbar);

  return (
    <Checkbox isSelected={alwaysShowToolbar} onChange={setAlwaysShowToolbar}>
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        Always show editor toolbar (docked under the file tabs)
      </Checkbox.Content>
    </Checkbox>
  );
}

function TerminalQuickKeysCheckbox() {
  const terminalQuickKeys = useGeneralStore((s) => s.terminalQuickKeys);
  const setTerminalQuickKeys = useGeneralStore((s) => s.setTerminalQuickKeys);

  return (
    <div className='flex items-center gap-2'>
      <Checkbox isSelected={terminalQuickKeys} onChange={setTerminalQuickKeys}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Terminal Quick Keys
        </Checkbox.Content>
      </Checkbox>
      <InfoTooltip>
        Enable hotkey shortcuts inside the integrated terminal.
      </InfoTooltip>
    </div>
  );
}

function TerminalShellSelect() {
  const terminalShell = useGeneralStore((s) => s.terminalShell);
  const setTerminalShell = useGeneralStore((s) => s.setTerminalShell);

  return (
    <div className='flex w-[220px] flex-col gap-2'>
      <div className='flex items-center gap-1.5'>
        <Label>Terminal Shell</Label>
        <InfoTooltip>
          Specify shell binary used for built-in terminal sessions.
        </InfoTooltip>
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
        <Select.Popover>
          <ListBox>
            <ListBox.Item id='auto'>
              <Label>auto</Label>
            </ListBox.Item>
            <ListBox.Item id='bash'>
              <Label>bash</Label>
            </ListBox.Item>
            <ListBox.Item id='zsh'>
              <Label>zsh</Label>
            </ListBox.Item>
            <ListBox.Item id='powershell'>
              <Label>powershell</Label>
            </ListBox.Item>
          </ListBox>
        </Select.Popover>
      </Select>
    </div>
  );
}
