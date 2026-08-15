import { ShortcutsModal } from '@/app/components/chat-sidebar/sidebar-footer';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useGlobalModalStore } from '@/app/providers';
import { useSettingsModalStore } from '@/app/providers/settings/settings-store';

export function KeyPressProvider() {
  const toggleOpenShortcutsModal = useGlobalModalStore(
    (state) => state.toggleOpen,
  );

  useKeyPress(
    '.',
    () => toggleOpenShortcutsModal({ children: <ShortcutsModal /> }),
    {
      modifiers: { meta: false, ctrl: true, alt: false },
    },
  );

  const toggleOpenSettingsModal = useSettingsModalStore(
    (state) => state.toggleOpenModal,
  );

  useKeyPress(',', () => toggleOpenSettingsModal(), {
    modifiers: { meta: false, ctrl: true, alt: false },
  });

  return null;
}
