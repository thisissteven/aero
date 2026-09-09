import { ChatAside } from '@/app/components/chat-aside/chat-aside';
import { useSidePanelStore } from '@/app/stores/side-panel-store';

export function ConnectedChatAside() {
  const isOpen = useSidePanelStore((s) => s.isOpen);
  const activeNavItem = useSidePanelStore((s) => s.activeNavItem);
  const toggleNavItem = useSidePanelStore((s) => s.toggleNavItem);

  return (
    <ChatAside
      activeItem={isOpen ? activeNavItem : null}
      onSelect={toggleNavItem}
    />
  );
}
