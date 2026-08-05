import { Comment, Folder, Magnifier, PlugWire } from '@gravity-ui/icons';
import { useLocation } from '@tanstack/react-router';

import { Avatar, Button, cn, Kbd, Spinner } from '@aero/ui';
import { Sidebar } from '@aero/ui';

import { useSessions } from '@/hooks/api/sessions';
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll';

import type { ChatThread } from '../data/chat';
import type { AeroSessionSummary } from '../../server/services/harness/types';

export interface ChatSidebarProps {
  pathname: string;
  basePath: string;
  disableNavigation?: boolean;
  onSearch?: () => void;
}

export function ChatSidebar({
  basePath,
  disableNavigation = false,
  pathname,
  onSearch,
}: ChatSidebarProps) {
  const sessionsQuery = useSessions();

  const contentProps = {
    basePath,
    disableNavigation,
    pathname,
    sessionsQuery,
    onSearch,
  };

  return (
    <>
      <Sidebar>
        <SidebarContents {...contentProps} />
      </Sidebar>

      <Sidebar.Mobile>
        <SidebarContents {...contentProps} idPrefix='mobile-' />
      </Sidebar.Mobile>
    </>
  );
}

interface SidebarContentsProps extends ChatSidebarProps {
  idPrefix?: string;
  sessionsQuery: ReturnType<typeof useSessions>;
}

function SidebarContents({
  basePath,
  idPrefix = '',
  pathname,
  sessionsQuery,
  onSearch,
}: SidebarContentsProps) {
  const location = useLocation();

  const currentHref = location.href;

  return (
    <>
      <Sidebar.Header className='px-0! pb-0!'>
        <div className='flex items-center gap-3 px-4 py-1'>
          <Avatar className='size-9'>
            <Avatar.Image alt={'User'} />
            <Avatar.Fallback>DH</Avatar.Fallback>
          </Avatar>
          <div className='flex min-w-0 flex-col' data-sidebar='label'>
            <span className='text-foreground text-sm leading-tight font-medium'>
              {'Darnell Howe'}
            </span>
            <span className='text-muted text-xs leading-tight font-medium'>
              {'darnell@email.com'}
            </span>
          </div>
        </div>

        <Sidebar.Group className='px-3'>
          <Sidebar.Menu aria-label='Chat actions'>
            <Sidebar.MenuItem
              href='/new'
              id={`${idPrefix}-new`}
              isCurrent={currentHref === '/new'}
              textValue='New Chat'
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
            >
              <Sidebar.MenuIcon>
                <PlugWire className='size-4' />
              </Sidebar.MenuIcon>
              <Sidebar.MenuLabel>Plugins</Sidebar.MenuLabel>
            </Sidebar.MenuItem>
          </Sidebar.Menu>
        </Sidebar.Group>

        <Sidebar.Separator className='my-0!' />
      </Sidebar.Header>

      <Sidebar.Content offset={2} className='py-2'>
        <Recents
          basePath={basePath}
          idPrefix={idPrefix}
          pathname={pathname}
          sessionsQuery={sessionsQuery}
        />
      </Sidebar.Content>

      <Sidebar.Footer className='sticky bottom-0 z-10 px-0! pt-0!'>
        <Sidebar.Separator className='mt-0!' />

        <div className='px-3'>
          <Button variant='ghost' className='w-full'>
            Settings
          </Button>
        </div>
      </Sidebar.Footer>
    </>
  );
}

interface RecentsProps {
  basePath: string;
  pathname: string;
  idPrefix?: string;
  sessionsQuery: ReturnType<typeof useSessions>;
}

function Recents({
  basePath,
  pathname,
  idPrefix = '',
  sessionsQuery,
}: RecentsProps) {
  const {
    items: threads,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteScroll<ChatThread | AeroSessionSummary>(sessionsQuery);

  return (
    <Sidebar.Group>
      <Sidebar.GroupLabel>Recent</Sidebar.GroupLabel>

      <Sidebar.Menu aria-label='Recent chats'>
        {threads.map((thread) => (
          <ChatSidebarThreadItem
            key={thread.id}
            idPrefix={idPrefix}
            basePath={basePath}
            disableNavigation={false}
            pathname={pathname}
            thread={thread}
          />
        ))}
      </Sidebar.Menu>

      <div ref={loadMoreRef} />

      {hasNextPage && (
        <div
          className={cn(
            'flex items-center justify-center py-2 text-sm opacity-0',
            isFetchingNextPage && 'opacity-100',
            'opacity-100',
          )}
        >
          <Spinner className='text-muted size-4' />
        </div>
      )}
    </Sidebar.Group>
  );
}

interface ChatSidebarThreadItemProps {
  basePath: string;
  disableNavigation: boolean;
  idPrefix: string;
  pathname: string;
  thread: ChatThread | AeroSessionSummary;
}

function ChatSidebarThreadItem({
  basePath,
  disableNavigation,
  idPrefix,
  pathname,
  thread,
}: ChatSidebarThreadItemProps) {
  const fullHref = `${basePath}/sessions/${thread.id}`;
  const isCurrent =
    pathname === fullHref ||
    pathname === thread.id ||
    pathname === `/${thread.id}`;

  return (
    <Sidebar.MenuItem
      href={disableNavigation ? undefined : fullHref}
      id={`${idPrefix}${thread.id}`}
      isCurrent={isCurrent}
      textValue={thread.title}
    >
      <Sidebar.MenuLabel>{thread.title}</Sidebar.MenuLabel>
    </Sidebar.MenuItem>
  );
}
