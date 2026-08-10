import { Gear } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Tooltip } from '@aero/ui';

import { useSettingsModalStore } from '@/app/providers/settings/store';

export function SettingsButton() {
  const { openModal } = useSettingsModalStore();
  return (
    <Tooltip delay={0}>
      <Tooltip.Trigger onClick={() => openModal('general')}>
        <div className='px-1 opacity-50 transition hover:opacity-100'>
          <Icon data={Gear} size={18} />
        </div>
      </Tooltip.Trigger>
      <Tooltip.Content>
        <p>Settings</p>
      </Tooltip.Content>
    </Tooltip>
  );
}
