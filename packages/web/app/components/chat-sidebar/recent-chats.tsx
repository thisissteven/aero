import { memo } from 'react';

import { cn, Sidebar, Spinner } from '@aero/ui';

import { ChatSidebarSessionItem } from '@/app/components/chat-sidebar/session-item';
import { ChatSession } from '@/app/data/chat';
import { useSessions } from '@/app/hooks/api/sessions';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { AeroSessionSummary } from '@/server/services/harness/types';

interface RecentChatsProps {
  basePath: string;
  pathname: string;
  idPrefix?: string;
  sessionsQuery: ReturnType<typeof useSessions>;
}

export const RecentChats = memo(function Recents({
  basePath,
  pathname,
  idPrefix = '',
  sessionsQuery,
}: RecentChatsProps) {
  const {
    items: sessions,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteScroll<ChatSession | AeroSessionSummary>(sessionsQuery);

  return (
    <Sidebar.Group>
      <Sidebar.GroupLabel>Recent</Sidebar.GroupLabel>

      <Sidebar.Menu aria-label='Recent chats'>
        {sessions.map((session) => (
          <ChatSidebarSessionItem
            key={session.id}
            idPrefix={idPrefix}
            basePath={basePath}
            disableNavigation={false}
            pathname={pathname}
            session={session}
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
