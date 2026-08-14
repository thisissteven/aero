import { Comment, Gear } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';

import { Command } from '@aero/ui';

import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';
import { useSettingsModalStore } from '@/app/providers/settings/settings-store';

export function CommandPaletteListActions() {
  const navigate = useNavigate();

  const openSettingsModal = useSettingsModalStore((state) => state.openModal);

  const toggleIsOpen = useCommandPaletteStore((state) => state.toggleIsOpen);

  function onSelect(callback: () => void) {
    toggleIsOpen();
    callback();
  }

  return (
    <Command.Group heading='Actions' className='pb-0.5'>
      <Command.Item
        textValue='New Chat'
        onAction={() => onSelect(() => navigate({ to: `/new` }))}
      >
        <Icon data={Comment} />
        New Chat
      </Command.Item>
      <Command.Item
        textValue='Settings'
        onAction={() => onSelect(openSettingsModal)}
      >
        <Icon data={Gear} />
        Settings
      </Command.Item>
    </Command.Group>
  );
}
