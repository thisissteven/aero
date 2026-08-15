// components/opencode-cli-section.tsx
import { Folder } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Button, Checkbox, Input, Label, Typography } from '@aero/ui';

import { InfoTooltip } from './info-tooltip';
import { useGeneralStore } from '../general-store';

export function OpenCodeCliSection() {
  return (
    <section className='space-y-6'>
      <Typography type='h6'>OpenCode CLI</Typography>

      <BinaryPathInput />

      <div className='space-y-3'>
        <ShowUpdateNotificationsCheckbox />
        <AgentControlToolCheckbox />
      </div>

      <div>
        <Button variant='tertiary'>Save & Reload</Button>
      </div>
    </section>
  );
}

function BinaryPathInput() {
  const binaryPath = useGeneralStore((s) => s.binaryPath);
  const setBinaryPath = useGeneralStore((s) => s.setBinaryPath);

  return (
    <div className='grid grid-cols-2'>
      <div className='flex items-center gap-1.5'>
        <Label>OpenCode Binary Path</Label>
        <InfoTooltip>Path to executable binary file.</InfoTooltip>
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

  return (
    <Checkbox
      isSelected={showUpdateNotifications}
      onChange={setShowUpdateNotifications}
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
        Show OpenCode update notifications
      </Checkbox.Content>
    </Checkbox>
  );
}

function AgentControlToolCheckbox() {
  const agentControlTool = useGeneralStore((s) => s.agentControlTool);
  const setAgentControlTool = useGeneralStore((s) => s.setAgentControlTool);

  return (
    <div className='flex items-center gap-2'>
      <Checkbox isSelected={agentControlTool} onChange={setAgentControlTool}>
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
          Agent control tool
        </Checkbox.Content>
      </Checkbox>
      <InfoTooltip>Enable internal agent management features.</InfoTooltip>
    </div>
  );
}
