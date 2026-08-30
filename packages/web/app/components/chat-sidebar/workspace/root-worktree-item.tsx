import { memo, useMemo, useState } from 'react';

import { Sidebar } from '@aero/ui';

import { ChatSidebarSessionItem } from '@/app/components/chat-sidebar/session/session-item';
import { dedupeById } from '@/app/components/chat-sidebar/workspace/workspace-item';
import { useSessions } from '@/app/hooks/api/sessions';
import { AeroWorktreeSummary } from '@/server/services/harness/types';

export interface RootWorktreeItemProps {
  idPrefix: string;
  worktree: AeroWorktreeSummary;
}

const INITIAL_LIMIT = 3;
const LIMIT_INCREMENT = 5;

export const RootWorktreeItem = memo(function RootWorktreeItem({
  idPrefix,
  worktree,
}: RootWorktreeItemProps) {
  const [limit, setLimit] = useState(INITIAL_LIMIT);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSessions({
    directory: worktree.directory,
    initialSessions: [],
    limit,
  });

  // Flatten infinite query pages and dedupe items safely
  const rawSessions = data?.pages.flatMap((page) => page.items) ?? [];
  const sessions = useMemo(() => dedupeById(rawSessions), [rawSessions]);

  return (
    <>
      {sessions.length === 0 && (
        <Sidebar.MenuItem
          id={`${idPrefix}-empty-root`}
          textValue='Empty session'
          isDisabled
          className='h-6 before:opacity-0'
        >
          <Sidebar.MenuItemContent>
            <Sidebar.MenuLabel className='text-xs'>
              0 sessions found in this workspace.
            </Sidebar.MenuLabel>
          </Sidebar.MenuItemContent>
        </Sidebar.MenuItem>
      )}

      {sessions.map((session) => (
        <ChatSidebarSessionItem
          key={session.id}
          idPrefix={`${idPrefix}-root`}
          session={session}
          isWorktreeItem
          from='workspaces'
        />
      ))}

      {hasNextPage && (
        <Sidebar.MenuItem
          id={`${idPrefix}-show-more-root`}
          textValue='show more sessions'
          className='group'
        >
          <Sidebar.MenuItemContent className='bg-transparent group-hover:bg-transparent'>
            <button
              type='button'
              disabled={isFetchingNextPage}
              onClick={async () => {
                await fetchNextPage();
                setLimit((prevLimit) => prevLimit + LIMIT_INCREMENT);
              }}
              className='text-muted hover:text-foreground text-xs disabled:opacity-50'
            >
              {isFetchingNextPage ? 'Loading...' : 'Show more sessions'}
            </button>
          </Sidebar.MenuItemContent>
        </Sidebar.MenuItem>
      )}
    </>
  );
});
