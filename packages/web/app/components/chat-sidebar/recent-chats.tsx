import { memo, useMemo } from 'react';

import {
  cn,
  ListLayout,
  Sidebar,
  Skeleton,
  Spinner,
  Virtualizer,
} from '@aero/ui';

import { ChatSidebarSessionItem } from '@/app/components/chat-sidebar/session-item';
import { useSessions } from '@/app/hooks/api/sessions';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { AeroSessionSummary } from '@/server/services/harness/types';

interface RecentChatsProps {
  basePath: string;
  pathname: string;
  idPrefix?: string;
  sessionsQuery: ReturnType<typeof useSessions>;
  /** Fixed row height for virtualizer calculations */
  rowHeight?: number;
}

function RecentChatsLoader({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <ul className='space-y-1'>
      {Array.from({ length: 20 }, (_, i) => {
        return (
          <li key={i}>
            <Skeleton className='h-9 w-full rounded-2xl' />
          </li>
        );
      })}
    </ul>
  );
}

export const RecentChats = memo(function Recents({
  basePath,
  pathname,
  idPrefix = '',
  sessionsQuery,
  rowHeight = 38,
}: RecentChatsProps) {
  const {
    items: sessions,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteScroll<AeroSessionSummary>(sessionsQuery);

  // Define layout instance for virtualizer
  const layout = useMemo(
    () =>
      new ListLayout<AeroSessionSummary>({
        rowHeight,
      }),
    [rowHeight],
  );

  // Derives current active session ID
  const selectedKeys = useMemo(() => {
    const match = pathname.match(/\/sessions\/([^/]+)/);
    const id = match ? match[1] : pathname.replace(/^\//, '');
    return id ? [id] : [];
  }, [pathname]);

  return (
    <Sidebar.Group className='p-0'>
      <Sidebar.GroupLabel>Recent</Sidebar.GroupLabel>

      <RecentChatsLoader enabled={!sessions && isFetchingNextPage} />

      {/* Passing dependencies forces Virtualizer to update when pathname/selection changes */}
      <Virtualizer layout={layout}>
        <Sidebar.Menu<AeroSessionSummary>
          aria-label='Recent chats'
          items={sessions}
          selectionMode='single'
          selectedKeys={selectedKeys}
          dependencies={[pathname]}
        >
          {(session) => (
            <ChatSidebarSessionItem
              key={session.id}
              idPrefix={idPrefix}
              basePath={basePath}
              disableNavigation={false}
              pathname={pathname}
              session={session}
            />
          )}
        </Sidebar.Menu>
      </Virtualizer>

      {/* Sentinel element for infinite scroll */}
      <div ref={loadMoreRef} className='h-1' />

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
