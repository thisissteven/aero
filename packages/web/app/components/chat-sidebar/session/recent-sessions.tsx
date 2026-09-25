import {
  Collection,
  cn,
  Sidebar,
  Skeleton,
  Spinner,
  StickySectionListLayout,
  Virtualizer,
} from '@aero/ui';
import { memo, useMemo } from 'react';

import { RecentsToggleEditModeButton } from '@/app/components/chat-sidebar/session/session-actions';
import { ChatSidebarSessionItem } from '@/app/components/chat-sidebar/session/session-item';
import { useSessions } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { groupSessionsByDay, SessionGroup } from '@/app/lib/session-groups';
import { AeroSessionSummary } from '@/server/services/harness/types';

interface RecentChatsProps {
  idPrefix?: string;
  /** Fixed row height for virtualizer calculations */
  rowHeight?: number;
}

/** Fixed height of a date group header, matching `.sidebar__menu-header`. */
const GROUP_HEADER_HEIGHT = 28;

/** Lift the sticky header by 0.5rem so it sits flush with the scrollport edge. */
const GROUP_HEADER_TOP = 8;

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
  const { t } = useI18n();

  const sessionsQuery = useSessions();

  const {
    items: sessions,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteScroll<AeroSessionSummary>(sessionsQuery);

  const groups = useMemo(() => groupSessionsByDay(sessions), [sessions]);

  const groupLabels: Record<SessionGroup['key'], string> = {
    today: t.session.today,
    yesterday: t.session.yesterday,
    older: t.session.older,
  };

  const layoutOptions = useMemo(
    () => ({
      rowSize: rowHeight,
      headingSize: GROUP_HEADER_HEIGHT,
      stickyHeaderOffset: -GROUP_HEADER_TOP,
    }),
    [rowHeight],
  );

  return (
    <>
      <div className='pl-3 pr-2 pt-2'>
        <Sidebar.GroupLabel className='flex items-center justify-between'>
          {t.session.recentSessions}
          <RecentsToggleEditModeButton />
        </Sidebar.GroupLabel>
      </div>

      <Sidebar.Content offset={2} className='py-2'>
        <Sidebar.Group>
          <RecentChatsLoader enabled={isLoading} />

          <Virtualizer
            layout={StickySectionListLayout}
            layoutOptions={layoutOptions}
          >
            <Sidebar.Menu<SessionGroup>
              aria-label={t.session.recentSessionsAria}
              className='sidebar__menu--virtualized'
              items={groups}
              selectionMode='single'
            >
              {(group) => (
                <Sidebar.MenuSection id={group.key} key={group.key}>
                  <Sidebar.MenuHeader>
                    {groupLabels[group.key]}
                  </Sidebar.MenuHeader>
                  <Collection items={group.sessions}>
                    {(session) => (
                      <ChatSidebarSessionItem
                        key={session.id}
                        idPrefix='recents'
                        session={session}
                        from='recents'
                      />
                    )}
                  </Collection>
                </Sidebar.MenuSection>
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
