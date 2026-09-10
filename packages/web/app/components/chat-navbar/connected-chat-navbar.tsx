import { useLocation } from '@tanstack/react-router';
import { useMemo } from 'react';

import { useSidePanelStore } from '@/app/stores/side-panel-store';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

import { ChatNavbar } from './chat-navbar';
import { resolveChatActivePage } from '../../data/chat';

export function ConnectedChatNavbar() {
  const { pathname } = useLocation();
  const isAsideOpen = useSidePanelStore((s) => s.isOpen);
  const isStatusPanelOpen = useStatusPanelStore((s) => s.isOpen);

  const activePage = useMemo(() => resolveChatActivePage(pathname), [pathname]);

  return (
    <ChatNavbar
      activePage={activePage}
      isAsideExpanded={isAsideOpen || isStatusPanelOpen}
    />
  );
}
