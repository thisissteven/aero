import { useCallback } from 'react';

import { Sidebar, useSidebar } from '@aero/ui';

import { SidebarContents } from '@/app/components/chat-sidebar/sidebar-contents';
import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';
import { useKeyPress } from '@/app/hooks/useKeyPress';

export interface ChatSidebarProps {
  onSearch?: () => void;
}

export function ChatSidebar() {
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
          <SidebarContents onSearch={onSearch} />
        </Sidebar>
      )}

      {isMobile && (
        <Sidebar.Mobile>
          <SidebarContents onSearch={onSearch} idPrefix='mobile-' />
        </Sidebar.Mobile>
      )}
    </>
  );
}
