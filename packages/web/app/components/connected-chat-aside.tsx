import { ChatAside } from '@/app/components/chat-aside';
import { useChatPanelStore } from '@/app/stores/chat-panel-store';

export function ConnectedChatAside() {
  const isOpen = useChatPanelStore((s) => s.isOpen);
  const activeNavItem = useChatPanelStore((s) => s.activeNavItem);
  const toggleNavItem = useChatPanelStore((s) => s.toggleNavItem);

  return (
    <ChatAside
      activeItem={isOpen ? activeNavItem : null}
      onSelect={toggleNavItem}
    />
  );
}
