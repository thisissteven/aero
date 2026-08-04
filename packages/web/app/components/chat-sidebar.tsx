import { useEffect, useMemo, useRef } from 'react';

import { Avatar, Button, cn, Kbd, Spinner } from '@aero/ui';
import { Sidebar } from '@aero/ui';

import { useSessions } from '@/hooks/api/sessions';

import type { ChatNavItem, ChatNavItemId, ChatThread } from '../data/chat';
import {
  CHAT_NAV_ITEMS,
  DEFAULT_CHAT_THREAD_ID,
  resolveChatActivePage,
} from '../data/chat';
import type { AeroSessionSummary } from '../../server/services/harness/types';

export interface ChatSidebarProps {
  pathname: string;
  basePath: string;
  disableNavigation?: boolean;
  onAction?: (id: ChatNavItemId) => void;
}

export function ChatSidebar({
  basePath,
  disableNavigation = false,
  onAction,
  pathname,
}: ChatSidebarProps) {
  const sessionsQuery = useSessions();

  const contentProps = {
    basePath,
    disableNavigation,
    onAction,
    pathname,
    sessionsQuery,
  };

  return (
    <>
      <Sidebar>
        <SidebarContents {...contentProps} />
        <Sidebar.Rail className='h-screen' />
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
  disableNavigation,
  idPrefix = '',
  onAction,
  pathname,
  sessionsQuery,
}: SidebarContentsProps) {
  const activePage = resolveChatActivePage(pathname, basePath);

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
            {CHAT_NAV_ITEMS.map((item) => (
              <ChatSidebarActionItem
                key={item.id}
                activePageKind={activePage.kind}
                basePath={basePath}
                disableNavigation={disableNavigation ?? false}
                idPrefix={idPrefix}
                item={item}
                onAction={onAction}
              />
            ))}
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
    data: sessionsData,
    isFetchingNextPage,
    hasNextPage,
    fetchNextPage,
  } = sessionsQuery;

  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  const threads = useMemo(() => {
    const sessions = sessionsData?.pages.flatMap((page) => page.items) ?? [];
    return Array.from(
      new Map(sessions.map((session) => [session.id, session])).values(),
    );
  }, [sessionsData]);

  useEffect(() => {
    const element = loadMoreRef.current;

    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
      },
      {
        threshold: 0.5,
      },
    );

    observer.observe(element);

    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);

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

      <div ref={loadMoreRef} className='h-1' />

      {hasNextPage && (
        <div
          className={cn(
            'text-muted flex items-center justify-center py-2 text-sm opacity-0',
            isFetchingNextPage && 'opacity-100',
          )}
        >
          <Spinner className='size-4' />
        </div>
      )}
    </Sidebar.Group>
  );
}

interface ChatSidebarActionItemProps {
  activePageKind: ReturnType<typeof resolveChatActivePage>['kind'];
  basePath: string;
  disableNavigation: boolean;
  idPrefix: string;
  item: ChatNavItem;
  onAction?: (id: ChatNavItemId) => void;
}

function ChatSidebarActionItem({
  activePageKind,
  basePath,
  disableNavigation,
  idPrefix,
  item,
  onAction,
}: ChatSidebarActionItemProps) {
  const Icon = item.icon;
  const fullHref = item.href ? basePath + item.href : undefined;
  const isCurrent = activePageKind !== 'thread' && item.id === activePageKind;

  const handlePress = () => {
    if (disableNavigation) return;
    onAction?.(item.id);
  };

  return (
    <Sidebar.MenuItem
      href={item.href && !disableNavigation ? fullHref : undefined}
      id={`${idPrefix}${item.id}`}
      isCurrent={Boolean(isCurrent)}
      textValue={item.label}
      onPress={handlePress}
    >
      <Sidebar.MenuIcon>
        <Icon className='size-4' />
      </Sidebar.MenuIcon>
      <Sidebar.MenuLabel>{item.label}</Sidebar.MenuLabel>
      {item.shortcut ? (
        <Sidebar.MenuChip>
          <Kbd className='text-[11px]'>{item.shortcut}</Kbd>
        </Sidebar.MenuChip>
      ) : null}
    </Sidebar.MenuItem>
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
    pathname === `/${thread.id}` ||
    (thread.id === DEFAULT_CHAT_THREAD_ID &&
      (pathname === basePath ||
        pathname === `${basePath}/` ||
        pathname === '/'));

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
