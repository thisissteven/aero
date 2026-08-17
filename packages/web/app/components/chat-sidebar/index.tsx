import { useCallback } from 'react';

import { Sidebar, useSidebar } from '@aero/ui';

import { SidebarContents } from '@/app/components/chat-sidebar/sidebar-contents';
import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';
import { useSessions } from '@/app/hooks/api/sessions';
import { useWorkspaces } from '@/app/hooks/api/workspaces';
import { useKeyPress } from '@/app/hooks/useKeyPress';

export interface ChatSidebarProps {
  onSearch?: () => void;
}

export function ChatSidebar() {
  const sessionsQuery = useSessions();
  const workspacesQuery = useWorkspaces();
  const { toggleSidebar, isMobile } = useSidebar();

  useKeyPress('l', toggleSidebar, {
    modifiers: { mod: true },
  });

  const setIsSearchOpen = useCommandPaletteStore((state) => state.setIsOpen);

  const onSearch = useCallback(() => {
    setIsSearchOpen(true);
  }, []);

  return (
    <>
      {!isMobile && (
        <Sidebar>
          <SidebarContents
            {...{
              sessionsQuery,
              workspacesQuery,
              onSearch,
            }}
          />
        </Sidebar>
      )}

      {isMobile && (
        <Sidebar.Mobile>
          <SidebarContents
            {...{
              sessionsQuery,
              workspacesQuery,
              onSearch,
            }}
            idPrefix='mobile-'
          />
        </Sidebar.Mobile>
      )}
    </>
  );
}
