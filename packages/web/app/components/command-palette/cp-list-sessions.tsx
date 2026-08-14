import { Comment } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { RefObject, useEffect } from 'react';
import { useMemo, useRef } from 'react';

import { cn, Command, Spinner } from '@aero/ui';

import { useCommandPaletteStore } from '@/app/components/command-palette/command-palette-store';
import { useSessions } from '@/app/hooks/api/sessions';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { formatCompactRelativeTime } from '@/app/lib';
import type { AeroSessionSummary } from '@/server/services/harness/types';

export function CommandPaletteListSessions({
  listRef,
}: {
  listRef: RefObject<HTMLDivElement | null>;
}) {
  const debouncedSearch = useCommandPaletteStore(
    (state) => state.debouncedSearch,
  );

  const sessionsQuery = useSessions(debouncedSearch || undefined);
  const { isPlaceholderData } = sessionsQuery;

  const view = useMemo(
    () => ({
      sessionsHeading: debouncedSearch ? 'Search results' : 'Recent Sessions',
    }),
    [debouncedSearch],
  );

  const committedViewRef = useRef(view);
  if (!isPlaceholderData) {
    committedViewRef.current = view;
  }
  const {
    items: sessions,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteScroll<AeroSessionSummary>(sessionsQuery, {
    search: debouncedSearch,
    rootRef: listRef,
    limitWithoutSearch: 10,
  });

  useEffect(() => {
    listRef.current?.scrollTo({ top: 0 });
  }, [debouncedSearch]);

  const navigate = useNavigate();
  const toggleIsOpen = useCommandPaletteStore((state) => state.toggleIsOpen);

  function onSelect(callback: () => void) {
    toggleIsOpen();
    callback();
  }

  return (
    <Command.Group
      heading={committedViewRef.current.sessionsHeading}
      className='pb-0.5'
    >
      {sessions.map((session) => {
        const updatedAtStr = formatCompactRelativeTime(session.updatedAt);
        return (
          <Command.Item
            key={session.id}
            id={session.id}
            textValue={`${session.title} Recent session`}
            onAction={() =>
              onSelect(() => navigate({ to: `/sessions/${session.id}` }))
            }
          >
            <Icon data={Comment} />
            <div className='flex min-w-0 flex-col'>
              <span className='text-foreground truncate text-sm font-medium'>
                {session.title}
              </span>
              <span className='text-muted truncate text-xs'>Recent chat</span>
            </div>
            <span className='text-muted ml-auto shrink-0 text-[11px]'>
              {updatedAtStr}
            </span>
          </Command.Item>
        );
      })}

      {hasNextPage && (
        <Command.Item
          key='sentinel-loader'
          id='sentinel-loader'
          textValue='__sentinel__'
          ref={loadMoreRef}
          className='flex cursor-default items-center justify-center py-2 text-sm aria-selected:bg-transparent'
          isDisabled
        >
          <div
            className={cn(
              'flex items-center justify-center transition-opacity',
              isFetchingNextPage ? 'opacity-100' : 'opacity-0',
            )}
          >
            <Spinner className='text-muted size-4' />
          </div>
        </Command.Item>
      )}
    </Command.Group>
  );
}
