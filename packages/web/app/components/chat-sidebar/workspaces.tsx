import { memo, useMemo } from 'react';

import {
  cn,
  ListLayout,
  Sidebar,
  Skeleton,
  Spinner,
  Virtualizer,
} from '@aero/ui';

import { RecentsToggleEditModeButton } from '@/app/components/chat-sidebar/session-actions';
import { ChatSidebarSessionItem } from '@/app/components/chat-sidebar/session-item';
import { useSessions } from '@/app/hooks/api/sessions';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { AeroSessionSummary } from '@/server/services/harness/types';

interface WorkspacesProps {
  pathname: string;
  idPrefix?: string;
  sessionsQuery: ReturnType<typeof useSessions>;
  /** Fixed row height for virtualizer calculations */
  rowHeight?: number;
}

function WorkspacesLoader({ enabled }: { enabled: boolean }) {
  if (!enabled) return null;

  return (
    <ul className='space-y-1'>
      {Array.from({ length: 20 }, (_, i) => {
        return (
          <li key={i}>
            <Skeleton className='h-[38px] w-full rounded-2xl' />
          </li>
        );
      })}
    </ul>
  );
}

export const Workspaces = memo(function Recents({
  pathname,
  idPrefix = '',
  sessionsQuery,
  rowHeight = 38,
}: WorkspacesProps) {
  const {
    items: sessions,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
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
    <>
      <div className='px-2 pt-2'>
        <Sidebar.GroupLabel className='flex items-center justify-between'>
          Workspaces
          <RecentsToggleEditModeButton />
        </Sidebar.GroupLabel>
      </div>

      <Sidebar.Content offset={2} className='py-2'>
        <Sidebar.Group>
          <WorkspacesLoader enabled={isLoading} />

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
                  pathname={pathname}
                  session={session}
                />
              )}
            </Sidebar.Menu>
          </Virtualizer>

          {/* Sentinel element for infinite scroll */}
          <div ref={loadMoreRef}>
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
        </Sidebar.Group>
      </Sidebar.Content>
    </>
  );
});
