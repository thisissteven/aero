import { ChatAside } from '@/app/components/chat-aside';
import { useChatPanelStore } from '@/app/stores/chat-panel-store';

export function ConnectedChatAside() {
  const activeNavItem = useChatPanelStore((s) => s.activeNavItem);
  const toggleNavItem = useChatPanelStore((s) => s.toggleNavItem);

  return <ChatAside activeItem={activeNavItem} onSelect={toggleNavItem} />;
}
