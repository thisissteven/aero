// components/opencode-cli-section.tsx

import { Button, Checkbox, Input, Label, Typography } from '@aero/ui';
import { Folder } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useI18n } from '@/app/hooks/i18n';
import { useGeneralStore } from '../general-store';
import { InfoTooltip } from './info-tooltip';

export function OpenCodeCliSection() {
  const { t } = useI18n();

  return (
    <section className='space-y-6'>
      <Typography type='h6'>{t.settingsGeneral.opencodeCli}</Typography>

      <BinaryPathInput />

      <div className='space-y-3'>
        <ShowUpdateNotificationsCheckbox />
        <AgentControlToolCheckbox />
      </div>

      <div>
        <Button variant='tertiary'>{t.settingsGeneral.saveAndReload}</Button>
      </div>
    </section>
  );
}

function BinaryPathInput() {
  const binaryPath = useGeneralStore((s) => s.binaryPath);
  const setBinaryPath = useGeneralStore((s) => s.setBinaryPath);
  const { t } = useI18n();

  return (
    <div className='max-sm:grid-cols-1 max-sm:gap-2 grid grid-cols-2'>
      <div className='flex items-center gap-1.5'>
        <Label>{t.settingsGeneral.opencodeBinaryPath}</Label>
        <InfoTooltip>{t.settingsGeneral.opencodeBinaryPathTooltip}</InfoTooltip>
      </div>
      <div className='flex items-center gap-2'>
        <Input
          value={binaryPath}
          onChange={(e) => setBinaryPath(e.target.value)}
          className='font-mono text-xs'
        />
        <Button variant='outline' size='sm' className='px-2.5'>
          <Icon data={Folder} className='size-4' />
        </Button>
      </div>
    </div>
  );
}

function ShowUpdateNotificationsCheckbox() {
  const showUpdateNotifications = useGeneralStore(
    (s) => s.showUpdateNotifications,
  );
  const setShowUpdateNotifications = useGeneralStore(
    (s) => s.setShowUpdateNotifications,
  );
  const { t } = useI18n();

  return (
    <Checkbox
      isSelected={showUpdateNotifications}
      onChange={setShowUpdateNotifications}
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        {t.settingsGeneral.showOpencodeUpdates}
      </Checkbox.Content>
    </Checkbox>
  );
}

function AgentControlToolCheckbox() {
  const agentControlTool = useGeneralStore((s) => s.agentControlTool);
  const setAgentControlTool = useGeneralStore((s) => s.setAgentControlTool);
  const { t } = useI18n();

  return (
    <div className='flex items-center gap-2'>
      <Checkbox isSelected={agentControlTool} onChange={setAgentControlTool}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          {t.settingsGeneral.agentControlTool}
        </Checkbox.Content>
      </Checkbox>
      <InfoTooltip>{t.settingsGeneral.agentControlToolTooltip}</InfoTooltip>
    </div>
  );
}
