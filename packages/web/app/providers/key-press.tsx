import { useNavigate } from '@tanstack/react-router';

import { ShortcutsModal } from '@/app/components/chat-sidebar/sidebar-footer';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useGlobalModalStore } from '@/app/providers';
import { useSettingsModalStore } from '@/app/providers/settings/settings-store';
import { useChatPanelStore } from '@/app/stores/chat-panel-store';

export function KeyPressProvider() {
  const toggleOpenShortcutsModal = useGlobalModalStore(
    (state) => state.toggleOpen,
  );

  useKeyPress(
    '.',
    () => toggleOpenShortcutsModal({ children: <ShortcutsModal /> }),
    {
      ignoreInputs: false,
      modifiers: { mod: true },
    },
  );

  const toggleOpenSettingsModal = useSettingsModalStore(
    (state) => state.toggleOpenModal,
  );

  useKeyPress(',', () => toggleOpenSettingsModal(), {
    ignoreInputs: false,
    modifiers: { mod: true },
  });

  const toggleOpenRightPanel = useChatPanelStore(
    (state) => state.openClosePanelWithShortcut,
  );

  useKeyPress('b', () => toggleOpenRightPanel(), {
    ignoreInputs: false,
    modifiers: { mod: true, shift: false },
  });

  useKeyPress('p', () => toggleOpenRightPanel('context'), {
    ignoreInputs: false,
    modifiers: { mod: true, shift: true },
  });

  useKeyPress('f', () => toggleOpenRightPanel('files'), {
    ignoreInputs: false,
    modifiers: { mod: true, shift: true },
  });

  useKeyPress('g', () => toggleOpenRightPanel('git'), {
    ignoreInputs: false,
    modifiers: { mod: true, shift: true },
  });

  const openAndExpandRightPanel = useChatPanelStore(
    (state) => state.openAndExpandPanelWithShortcut,
  );

  useKeyPress('j', () => openAndExpandRightPanel('terminal'), {
    ignoreInputs: false,
    modifiers: { mod: true, shift: true },
  });

  useKeyPress('j', () => toggleOpenRightPanel('terminal'), {
    ignoreInputs: false,
    modifiers: { mod: true, shift: false },
  });

  const navigate = useNavigate();

  useKeyPress('n', () => navigate({ to: '/new' }), {
    modifiers: { mod: false, alt: false, shift: false },
  });

  return null;
}
