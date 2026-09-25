import {
  Collection,
  cn,
  Sidebar,
  Skeleton,
  Spinner,
  StickySectionListLayout,
  Virtualizer,
} from '@aero/ui';
import { memo, useEffect, useMemo, useRef } from 'react';

import { RecentsToggleEditModeButton } from '@/app/components/chat-sidebar/session/session-actions';
import { ChatSidebarSessionItem } from '@/app/components/chat-sidebar/session/session-item';
import { useSessions } from '@/app/hooks/api/sessions';
import { usePinnedSessions } from '@/app/hooks/api/settings';
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

  const contentRef = useRef<HTMLDivElement>(null);

  // Mark the header currently pinned to the top of the scroll container so only
  // it renders the top fade. Headers are mounted/unmounted by the virtualizer
  // as you scroll, so new ones are attached via a MutationObserver.
  useEffect(() => {
    const container = contentRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          entry.target.toggleAttribute('data-stuck', entry.isIntersecting);
        }
      },
      { root: container, rootMargin: '0px 0px -99% 0px', threshold: 0 },
    );

    const observeHeaders = (node: Element) => {
      if (node.classList.contains('sidebar__menu-header')) {
        observer.observe(node);
      }

      for (const header of node.querySelectorAll('.sidebar__menu-header')) {
        observer.observe(header);
      }
    };

    for (const header of container.querySelectorAll('.sidebar__menu-header')) {
      observer.observe(header);
    }

    const mutation = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node instanceof Element) observeHeaders(node);
        }
      }
    });

    mutation.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
      mutation.disconnect();
    };
  }, []);

  const pinnedSessions = usePinnedSessions();

  const groups = useMemo(
    () => groupSessionsByDay(sessions, { pinnedSessions }),
    [pinnedSessions, sessions],
  );

  const groupLabels: Record<SessionGroup['key'], string> = {
    pinned: t.session.pinned,
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

      <Sidebar.Content offset={2} className='py-2' ref={contentRef}>
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
