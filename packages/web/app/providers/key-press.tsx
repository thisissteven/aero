import { ShortcutsModal } from '@/app/components/chat-sidebar/sidebar-footer';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useGlobalModalStore } from '@/app/providers';

export function KeyPressProvider() {
  const openShortcutsModal = useGlobalModalStore((state) => state.openModal);

  useKeyPress('.', () => openShortcutsModal({ children: <ShortcutsModal /> }), {
    modifiers: { meta: false, ctrl: true, alt: false },
  });

  return null;
}
