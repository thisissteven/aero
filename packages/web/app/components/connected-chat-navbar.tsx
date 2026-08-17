import { useLocation } from '@tanstack/react-router';
import { useMemo } from 'react';

import { useChatPanelStore } from '@/app/stores/chat-panel-store';

import { ChatNavbar } from './chat-navbar';
import { resolveChatActivePage } from '../data/chat';

export function ConnectedChatNavbar() {
  const { pathname } = useLocation();
  const isAsideExpanded = useChatPanelStore((s) => !!s.activeNavItem);

  const activePage = useMemo(() => resolveChatActivePage(pathname), [pathname]);

  return (
    <ChatNavbar activePage={activePage} isAsideExpanded={isAsideExpanded} />
  );
}
