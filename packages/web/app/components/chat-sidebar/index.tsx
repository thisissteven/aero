import { Sidebar, useSidebar } from '@aero/ui';

import { SidebarContents } from '@/app/components/chat-sidebar/sidebar-contents';
import { useSessions } from '@/app/hooks/api/sessions';
import { useKeyPress } from '@/app/hooks/useKeyPress';

export interface ChatSidebarProps {
  pathname: string;
  onSearch?: () => void;
}

export function ChatSidebar({ pathname, onSearch }: ChatSidebarProps) {
  const sessionsQuery = useSessions();
  const { toggleSidebar, isMobile } = useSidebar();

  const contentProps = {
    pathname,
    sessionsQuery,
    onSearch,
  };

  useKeyPress('l', toggleSidebar, {
    modifiers: { meta: false, ctrl: true, alt: false },
  });

  return (
    <>
      {/* Conditionally render mobile contents only when mobile drawer is active */}
      {!isMobile && (
        <Sidebar>
          <SidebarContents {...contentProps} />
        </Sidebar>
      )}

      {isMobile && (
        <Sidebar.Mobile>
          <SidebarContents {...contentProps} idPrefix='mobile-' />
        </Sidebar.Mobile>
      )}
    </>
  );
}
