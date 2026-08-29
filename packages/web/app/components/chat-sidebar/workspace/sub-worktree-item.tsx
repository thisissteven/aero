import { CircleTree, EllipsisVertical, Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useMemo, useState } from 'react';

import { Dropdown, Sidebar } from '@aero/ui';

import { WorkspaceSessionItem } from '@/app/components/chat-sidebar/session/session-item';
import { DeleteWorktree } from '@/app/components/chat-sidebar/workspace/workspace-actions';
import { dedupeById } from '@/app/components/chat-sidebar/workspace/workspace-item';
import { useSessions } from '@/app/hooks/api/sessions';
import { AeroWorktreeSummary } from '@/server/services/harness/types';

export interface SubWorktreeItemProps {
  idPrefix: string;
  worktree: AeroWorktreeSummary;
  onNewSessionClick: () => void;
}

const INITIAL_LIMIT = 3;
const LIMIT_INCREMENT = 5;

export const SubWorktreeItem = memo(function SubWorktreeItem({
  idPrefix,
  worktree,
  onNewSessionClick,
}: SubWorktreeItemProps) {
  const worktreeItemId = `${idPrefix}-wt-${worktree.id}`;

  const [limit, setLimit] = useState(INITIAL_LIMIT);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSessions({
    directory: worktree.directory,
    initialSessions: worktree.sessions,
    limit,
  });

  const rawSessions =
    data?.pages.flatMap((page) => page.items) ?? worktree.sessions;
  const sessions = useMemo(() => dedupeById(rawSessions), [rawSessions]);

  return (
    <Sidebar.MenuItem
      id={worktreeItemId}
      textValue={worktree.name}
      className='group pr-0! before:opacity-0'
    >
      <Sidebar.MenuItemContent className='relative ml-0 flex-1 gap-2 bg-transparent group-hover:bg-transparent'>
        <Sidebar.MenuIcon className='relative shrink-0 transition group-hover:opacity-0'>
          <Icon data={CircleTree} size={14} />
        </Sidebar.MenuIcon>

        <Sidebar.MenuTrigger className='absolute inset-0 flex h-full w-full items-center justify-start pl-3 opacity-0 transition group-hover:opacity-100'>
          <Sidebar.MenuIndicator />
        </Sidebar.MenuTrigger>

        <Sidebar.MenuLabel>{worktree.name}</Sidebar.MenuLabel>

        <Sidebar.MenuActions className='ml-auto translate-x-1.5'>
          <Sidebar.MenuAction
            aria-label='Actions'
            className='group'
            onClick={(e) => {
              e.stopPropagation();
              e.preventDefault();
              onNewSessionClick();
            }}
          >
            <Icon
              data={Plus}
              className='opacity-50 transition-opacity group-hover:opacity-80'
              style={{ width: 12, height: 12 }}
            />
          </Sidebar.MenuAction>
          <Dropdown size='sm'>
            <Dropdown.Trigger
              aria-label={`More actions for ${worktree.name}`}
              className='sidebar__menu-action group'
              data-slot='sidebar-menu-action'
            >
              <Icon
                data={EllipsisVertical}
                className='opacity-50 transition-opacity group-hover:opacity-80'
                style={{
                  width: 12,
                  height: 12,
                }}
              />
            </Dropdown.Trigger>
            <Dropdown.Popover
              className='w-44'
              crossOffset={6}
              placement='bottom end'
            >
              <Dropdown.Menu aria-label={`${worktree.name} actions`}>
                <DeleteWorktree
                  worktreeName={worktree.name}
                  worktreeDirectory={worktree.directory}
                />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Sidebar.MenuActions>
      </Sidebar.MenuItemContent>

      <Sidebar.Submenu>
        {sessions.length === 0 && (
          <Sidebar.MenuItem
            id={`${worktreeItemId}-empty`}
            textValue='Empty session'
            isDisabled
            className='h-6 -translate-x-4 before:opacity-0'
          >
            <Sidebar.MenuItemContent>
              <Sidebar.MenuLabel className='text-xs'>
                0 sessions found in this worktree.
              </Sidebar.MenuLabel>
            </Sidebar.MenuItemContent>
          </Sidebar.MenuItem>
        )}

        {sessions.map((session) => (
          <WorkspaceSessionItem
            key={session.id}
            idPrefix={worktreeItemId}
            session={session}
            from='workspaces'
          />
        ))}

        {hasNextPage && (
          <Sidebar.MenuItem
            id={`${worktreeItemId}-show-more`}
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
      </Sidebar.Submenu>
    </Sidebar.MenuItem>
  );
});
