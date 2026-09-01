import { memo } from 'react';

import {
  cn,
  ListLayout,
  Sidebar,
  Skeleton,
  Spinner,
  Virtualizer,
} from '@aero/ui';

import { RecentsToggleEditModeButton } from '@/app/components/chat-sidebar/session/session-actions';
import { ChatSidebarSessionItem } from '@/app/components/chat-sidebar/session/session-item';
import { useSessions } from '@/app/hooks/api/sessions';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { AeroSessionSummary } from '@/server/services/harness/types';

interface RecentChatsProps {
  idPrefix?: string;
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
            <Skeleton className='h-[38px] w-full rounded-xl' />
          </li>
        );
      })}
    </ul>
  );
}

export const RecentChats = memo(function Recents({
  rowHeight = 38,
}: RecentChatsProps) {
  const sessionsQuery = useSessions();

  const {
    items: sessions,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteScroll<AeroSessionSummary>(sessionsQuery);

  return (
    <>
      <div className='px-2 pt-2'>
        <Sidebar.GroupLabel className='flex items-center justify-between'>
          Recent Sessions
          <RecentsToggleEditModeButton />
        </Sidebar.GroupLabel>
      </div>

      <Sidebar.Content offset={2} className='py-2'>
        <Sidebar.Group>
          <RecentChatsLoader enabled={isLoading} />

          <Virtualizer
            layout={ListLayout}
            layoutOptions={{ rowSize: rowHeight }}
          >
            <Sidebar.Menu<AeroSessionSummary>
              aria-label='Recent sessions'
              items={sessions}
              selectionMode='single'
            >
              {(session) => (
                <ChatSidebarSessionItem
                  key={session.id}
                  idPrefix='recents'
                  session={session}
                  from='recents'
                />
              )}
            </Sidebar.Menu>
          </Virtualizer>

          {/* Sentinel element for infinite scroll */}
          {hasNextPage && (
            <div ref={loadMoreRef} className='h-9'>
              <div
                aria-hidden={!hasNextPage}
                className={cn(
                  'flex items-center justify-center py-2 text-sm',
                  isFetchingNextPage && 'opacity-100',
                  !hasNextPage && 'h-0 py-0 opacity-0',
                )}
              >
                <Spinner className='text-muted size-4' />
              </div>
            </div>
          )}
        </Sidebar.Group>
      </Sidebar.Content>
    </>
  );
});
