import { Sidebar, useSidebar } from '@aero/ui';

import { SidebarContents } from '@/app/components/chat-sidebar/sidebar-contents';
import { useSessions } from '@/app/hooks/api/sessions';
import { useWorkspaces } from '@/app/hooks/api/workspaces';
import { useKeyPress } from '@/app/hooks/useKeyPress';

export interface ChatSidebarProps {
  pathname: string;
  onSearch?: () => void;
}

export function ChatSidebar({ pathname, onSearch }: ChatSidebarProps) {
  const sessionsQuery = useSessions();
  const workspacesQuery = useWorkspaces();
  const { toggleSidebar, isMobile } = useSidebar();

  useKeyPress('l', toggleSidebar, {
    modifiers: { meta: false, ctrl: true, alt: false },
  });

  return (
    <>
      {!isMobile && (
        <Sidebar>
          <SidebarContents
            {...{
              pathname,
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
              pathname,
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
