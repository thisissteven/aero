import {
  CircleInfo,
  CircleQuestion,
  Comment,
  Folder,
  Magnifier,
  PlugWire,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { memo, useTransition } from 'react';

import { Kbd, Sidebar, Tooltip } from '@aero/ui';

import { RecentChats } from '@/app/components/chat-sidebar/recent-chats';
import { SettingsButton } from '@/app/components/chat-sidebar/settings-button';
import { useSessions } from '@/app/hooks/api/sessions';

import { ChatSidebarProps } from './index';

interface SidebarContentsProps extends ChatSidebarProps {
  idPrefix?: string;
  sessionsQuery: ReturnType<typeof useSessions>;
}

export const SidebarContents = memo(function SidebarContents({
  basePath,
  idPrefix = '',
  pathname,
  sessionsQuery,
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

  return (
    <>
      <Sidebar.Header className='px-0 pb-0'>
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
              href='/workspaces'
              id={`${idPrefix}-workspaces`}
              isCurrent={currentHref === '/workspaces'}
              textValue='Workspaces'
              onPress={() => handleNavigate('/workspaces')}
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
      </Sidebar.Header>

      <Sidebar.Separator className='mb-0' />

      <Sidebar.Content offset={2} className='py-2'>
        <RecentChats
          basePath={basePath}
          pathname={pathname}
          sessionsQuery={sessionsQuery}
        />
      </Sidebar.Content>

      <Sidebar.Footer className='sticky bottom-0 z-10 px-0 pt-0'>
        <div className='mt-1.5 space-x-2 px-4'>
          <SettingsButton />

          <Tooltip delay={0}>
            <Tooltip.Trigger>
              <div className='px-1 opacity-50 transition hover:opacity-100'>
                <Icon data={CircleQuestion} size={18} />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Shortcuts</p>
            </Tooltip.Content>
          </Tooltip>

          <Tooltip delay={0}>
            <Tooltip.Trigger>
              <div className='px-1 opacity-50 transition hover:opacity-100'>
                <Icon data={CircleInfo} size={18} />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>About Aero</p>
            </Tooltip.Content>
          </Tooltip>
        </div>
      </Sidebar.Footer>
    </>
  );
});
