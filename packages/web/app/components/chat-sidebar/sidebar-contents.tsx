import {
  ArrowUturnCcwLeft,
  Comment,
  Folder,
  Magnifier,
  PlugWire,
} from '@gravity-ui/icons';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { memo, useState, useTransition } from 'react';

import { Kbd, Sidebar } from '@aero/ui';

import { RecentChats } from '@/app/components/chat-sidebar/recent-chats';
import { Workspaces } from '@/app/components/chat-sidebar/workspaces';
import { TransitionInOut } from '@/app/components/transitions/in-and-out/TransitionInOut';
import { TransitionLeftRight } from '@/app/components/transitions/transition-left-right/TransitionLeftRight';
import { useSessions } from '@/app/hooks/api/sessions';
import { useWorkspaces } from '@/app/hooks/api/workspaces';

import { ChatSidebarProps } from './index';
import { SidebarFooter } from './sidebar-footer';

interface SidebarContentsProps extends ChatSidebarProps {
  idPrefix?: string;
  sessionsQuery: ReturnType<typeof useSessions>;
  workspacesQuery: ReturnType<typeof useWorkspaces>;
}

export const SidebarContents = memo(function SidebarContents({
  idPrefix = '',
  pathname,
  sessionsQuery,
  workspacesQuery,
  onSearch,
}: SidebarContentsProps) {
  const [, startTransition] = useTransition();

  const location = useLocation();
  const navigate = useNavigate();

  const handleNavigate = (to: string) => {
    startTransition(() => {
      navigate({ to });
    });
  };

  const currentHref = location.href;

  const [isWorkspacesOpen, setIsWorkspacesOpen] = useState(false);

  return (
    <>
      <Sidebar.Header className='px-0 pb-0'>
        <TransitionLeftRight
          current={isWorkspacesOpen ? 'right' : 'left'}
          left={
            <Sidebar.Group className='px-3'>
              <Sidebar.Menu aria-label='Chat actions'>
                <Sidebar.MenuItem
                  href='/new'
                  id={`${idPrefix}-new`}
                  isCurrent={currentHref === '/new'}
                  textValue='New Chat'
                  onPress={() => handleNavigate('/new')}
                >
                  <Sidebar.MenuIcon>
                    <Comment className='size-4' />
                  </Sidebar.MenuIcon>
                  <Sidebar.MenuLabel>New Chat</Sidebar.MenuLabel>
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
                  onPress={() => setIsWorkspacesOpen(true)}
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
                  isCurrent={currentHref === '/plugins'}
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
            <Sidebar.Group className='px-3'>
              <Sidebar.Menu aria-label='Chat actions'>
                <Sidebar.MenuItem
                  textValue='Back'
                  onPress={() => setIsWorkspacesOpen(false)}
                  closeMobileOnAction={false}
                >
                  <Sidebar.MenuIcon>
                    <ArrowUturnCcwLeft className='size-4' />
                  </Sidebar.MenuIcon>
                  <Sidebar.MenuLabel>Back</Sidebar.MenuLabel>
                </Sidebar.MenuItem>
              </Sidebar.Menu>
            </Sidebar.Group>
          }
        />
      </Sidebar.Header>

      <Sidebar.Separator className='mb-0' />

      <TransitionInOut
        current={isWorkspacesOpen ? 'second' : 'first'}
        first={
          <RecentChats pathname={pathname} sessionsQuery={sessionsQuery} />
        }
        second={
          <Workspaces pathname={pathname} workspacesQuery={workspacesQuery} />
        }
      />

      <SidebarFooter />
    </>
  );
});
