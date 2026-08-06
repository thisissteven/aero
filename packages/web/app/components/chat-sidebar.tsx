import {
  CircleInfo,
  CircleQuestion,
  Comment,
  Folder,
  Gear,
  Magnifier,
  PlugWire,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useLocation, useNavigate } from '@tanstack/react-router';
import { memo, useTransition } from 'react';

import {
  Avatar,
  cn,
  Kbd,
  Sidebar,
  Spinner,
  Tooltip,
  useSidebar,
} from '@aero/ui';

import { useSessions } from '@/app/hooks/api/sessions';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { useKeyPress } from '@/app/hooks/useKeyPress';

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
  const { toggleSidebar, isMobile } = useSidebar();

  const contentProps = {
    basePath,
    disableNavigation,
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

interface SidebarContentsProps extends ChatSidebarProps {
  idPrefix?: string;
  sessionsQuery: ReturnType<typeof useSessions>;
}

const SidebarContents = memo(function SidebarContents({
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
        <div className='mt-1.5 space-x-2 px-4'>
          <Tooltip delay={0}>
            <Tooltip.Trigger>
              <div className='px-1 opacity-50 transition hover:opacity-100'>
                <Icon data={Gear} size={18} />
              </div>
            </Tooltip.Trigger>
            <Tooltip.Content>
              <p>Settings</p>
            </Tooltip.Content>
          </Tooltip>

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

interface RecentsProps {
  basePath: string;
  pathname: string;
  idPrefix?: string;
  sessionsQuery: ReturnType<typeof useSessions>;
}

const Recents = memo(function Recents({
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
          )}
        >
          <Spinner className='text-muted size-4' />
        </div>
      )}
    </Sidebar.Group>
  );
});

interface ChatSidebarThreadItemProps {
  basePath: string;
  disableNavigation: boolean;
  idPrefix: string;
  pathname: string;
  thread: ChatThread | AeroSessionSummary;
}

// 1. Memoized thread item to prevent re-rendering unchanged sessions
const ChatSidebarThreadItem = memo(
  function ChatSidebarThreadItem({
    basePath,
    disableNavigation,
    idPrefix,
    pathname,
    thread,
  }: ChatSidebarThreadItemProps) {
    const navigate = useNavigate();
    const [, startTransition] = useTransition();

    const fullHref = `${basePath}/sessions/${thread.id}`;
    const isCurrent =
      pathname === fullHref ||
      pathname === thread.id ||
      pathname === `/${thread.id}`;

    // 2. Non-blocking navigation transition on click
    const handlePress = () => {
      if (disableNavigation || isCurrent) return;
      startTransition(() => {
        navigate({ to: fullHref });
      });
    };

    return (
      <Sidebar.MenuItem
        id={`${idPrefix}${thread.id}`}
        isCurrent={isCurrent}
        textValue={thread.title}
        onPress={handlePress}
      >
        <Sidebar.MenuLabel>{thread.title}</Sidebar.MenuLabel>
      </Sidebar.MenuItem>
    );
  },
  (prev, next) => {
    const prevIsCurrent =
      prev.pathname === `${prev.basePath}/sessions/${prev.thread.id}` ||
      prev.pathname === prev.thread.id ||
      prev.pathname === `/${prev.thread.id}`;

    const nextIsCurrent =
      next.pathname === `${next.basePath}/sessions/${next.thread.id}` ||
      next.pathname === next.thread.id ||
      next.pathname === `/${next.thread.id}`;

    return (
      prev.thread.id === next.thread.id &&
      prev.thread.title === next.thread.title &&
      prevIsCurrent === nextIsCurrent &&
      prev.disableNavigation === next.disableNavigation
    );
  },
);
