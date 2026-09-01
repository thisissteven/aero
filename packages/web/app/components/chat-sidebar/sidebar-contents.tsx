import { Comment, Folder, Magnifier, PlugWire } from '@gravity-ui/icons';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { memo, useTransition } from 'react';

import { Kbd, Sidebar } from '@aero/ui';

import { RightSidebarview } from '@/app/components/chat-sidebar/right-sidebar-view';
import { RecentChats } from '@/app/components/chat-sidebar/session/recent-sessions';
import { useRecentsSidebarStore } from '@/app/components/chat-sidebar/sidebar-store';
import {
  useWorkspaceStore,
  WorkspacesView,
} from '@/app/components/chat-sidebar/workspace/workspaces-view';
import { TransitionInOut } from '@/app/components/transitions/in-and-out/TransitionInOut';
import { TransitionLeftRight } from '@/app/components/transitions/transition-left-right/TransitionLeftRight';

import { ChatSidebarProps } from './index';
import { SidebarFooter } from './sidebar-footer';

interface SidebarContentsProps extends ChatSidebarProps {
  idPrefix?: string;
}

export const SidebarContents = memo(function SidebarContents({
  idPrefix = '',
  onSearch,
}: SidebarContentsProps) {
  const [, startTransition] = useTransition();

  const { href } = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (to: string) => {
    startTransition(() => {
      navigate({ to });
    });
  };

  const isWorkspacesOpen = useWorkspaceStore((state) => state.isWorkspacesOpen);
  const setIsWorkspacesOpen = useWorkspaceStore(
    (state) => state.setIsWorkspacesOpen,
  );

  const toggleIsEditModeRecents = useRecentsSidebarStore(
    (state) => state.toggleisEditMode,
  );

  return (
    <>
      <Sidebar.Header className='px-0 pt-3 pb-1'>
        <TransitionLeftRight
          current={isWorkspacesOpen ? 'right' : 'left'}
          left={
            <Sidebar.Group className='px-3'>
              <Sidebar.Menu aria-label='Chat actions'>
                <Sidebar.MenuItem
                  href='/new'
                  id={`${idPrefix}-new`}
                  isCurrent={href === '/new'}
                  textValue='New Session'
                  onPress={() => handleNavigate('/new')}
                >
                  <Sidebar.MenuIcon>
                    <Comment className='size-4' />
                  </Sidebar.MenuIcon>
                  <Sidebar.MenuLabel>New Session</Sidebar.MenuLabel>
                </Sidebar.MenuItem>

                <Sidebar.MenuItem textValue='Search' onPress={onSearch}>
                  <Sidebar.MenuIcon>
                    <Magnifier className='size-4' />
                  </Sidebar.MenuIcon>
                  <Sidebar.MenuLabel>Search</Sidebar.MenuLabel>
                  <Sidebar.MenuChip>
                    <Kbd className='text-[11px]'>⌘K</Kbd>
                  </Sidebar.MenuChip>
                </Sidebar.MenuItem>

                <Sidebar.MenuItem
                  textValue='Workspaces'
                  onPress={() => {
                    if (useRecentsSidebarStore.getState().isEditMode) {
                      toggleIsEditModeRecents();
                    }
                    setIsWorkspacesOpen(true);
                  }}
                  closeMobileOnAction={false}
                >
                  <Sidebar.MenuIcon>
                    <Folder className='size-4' />
                  </Sidebar.MenuIcon>
                  <Sidebar.MenuLabel>Workspaces</Sidebar.MenuLabel>
                </Sidebar.MenuItem>

                <Sidebar.MenuItem
                  href='/plugins'
                  id={`${idPrefix}-plugins`}
                  isCurrent={href === '/plugins'}
                  textValue='Plugins'
                  onPress={() => handleNavigate('/plugins')}
                >
                  <Sidebar.MenuIcon>
                    <PlugWire className='size-4' />
                  </Sidebar.MenuIcon>
                  <Sidebar.MenuLabel>Plugins</Sidebar.MenuLabel>
                </Sidebar.MenuItem>
              </Sidebar.Menu>
            </Sidebar.Group>
          }
          right={
            <RightSidebarview
              closeWorkspace={() => {
                setIsWorkspacesOpen(false);
              }}
            />
          }
        />
      </Sidebar.Header>

      {!isWorkspacesOpen && <Sidebar.Separator className='mb-0' />}

      <TransitionInOut
        current={isWorkspacesOpen ? 'second' : 'first'}
        first={<RecentChats />}
        second={<WorkspacesView />}
      />

      <SidebarFooter />
    </>
  );
});
