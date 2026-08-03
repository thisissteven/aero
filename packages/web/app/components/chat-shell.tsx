import { useLocation, useNavigate } from '@tanstack/react-router';
import type { ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { AppLayout } from '@aero/ui';

import { ChatNavbar } from './chat-navbar';
import { ChatSearchDialog } from './chat-search-dialog';
import { ChatSidebar } from './chat-sidebar';
import type { ChatActivePage, ChatNavItemId, ChatThread } from '../data/chat';
import {
  CHAT_NAV_ITEMS,
  CHAT_THREADS,
  DEFAULT_CHAT_THREAD_ID,
  resolveChatActivePage,
} from '../data/chat';

export interface ChatShellProps {
  children: ReactNode;
  basePath?: string;
  disableNavigation?: boolean;
}

export function ChatShell({
  basePath = '',
  children,
  disableNavigation = false,
}: ChatShellProps) {
  const navigate = useNavigate();
  const location = useLocation();

  const pathname = location.pathname;

  const [isSearchOpen, setIsSearchOpen] = useState(false);

  const handleNavigate = useCallback(
    (href: string) => {
      if (disableNavigation) return;

      navigate({
        to: `${basePath}${href}`,
      });
    },
    [navigate, basePath, disableNavigation],
  );

  const activePage = useMemo<ChatActivePage>(
    () => resolveChatActivePage(pathname, basePath),
    [pathname, basePath],
  );

  const handleNavAction = useCallback(
    (id: ChatNavItemId) => {
      if (disableNavigation) return;

      const item = CHAT_NAV_ITEMS.find((entry) => entry.id === id);

      if (item?.href) {
        navigate({
          to: `${basePath}${item.href}`,
        });
      }
    },
    [navigate, basePath, disableNavigation],
  );

  const handleThreadSelect = useCallback(
    (thread: ChatThread) => {
      setIsSearchOpen(false);

      if (!disableNavigation) {
        navigate({
          to: `${basePath}/sessions/${thread.id}`,
        });
      }
    },
    [navigate, basePath, disableNavigation],
  );

  useEffect(() => {
    if (disableNavigation) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      const isMac =
        typeof navigator !== 'undefined' &&
        /Mac|iPhone|iPad/.test(navigator.platform);

      const modifier = isMac ? event.metaKey : event.ctrlKey;

      if (modifier && (event.key === 'k' || event.key === 'K')) {
        event.preventDefault();
        setIsSearchOpen((open) => !open);
      }
    };

    window.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [disableNavigation]);

  return (
    <AppLayout
      navigate={handleNavigate}
      navbar={
        <ChatNavbar
          activePage={activePage}
          onSearch={disableNavigation ? undefined : () => setIsSearchOpen(true)}
        />
      }
      sidebar={
        <ChatSidebar
          basePath={basePath}
          disableNavigation={disableNavigation}
          pathname={pathname || `/${DEFAULT_CHAT_THREAD_ID}`}
          threads={CHAT_THREADS}
          onAction={handleNavAction}
        />
      }
      sidebarCollapsible='offcanvas'
      scrollMode='content'
    >
      {children}

      <ChatSearchDialog
        isOpen={isSearchOpen}
        threads={CHAT_THREADS}
        onOpenChange={setIsSearchOpen}
        onSelect={handleThreadSelect}
      />
    </AppLayout>
  );
}
