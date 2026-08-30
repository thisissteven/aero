import { CircleTree, EllipsisVertical } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useMemo, useState } from 'react';

import { Dropdown, Separator, Sidebar } from '@aero/ui';

import { WorkspaceSessionItem } from '@/app/components/chat-sidebar/session/session-item';
import {
  CopyDirectoryPath,
  DeleteWorktree,
} from '@/app/components/chat-sidebar/workspace/workspace-actions';
import { dedupeById } from '@/app/components/chat-sidebar/workspace/workspace-item';
import { WorkspaceNewSessionButton } from '@/app/components/chat-sidebar/workspace/workspace-new-session-button';
import { useSessions } from '@/app/hooks/api/sessions';
import {
  AeroWorkspaceSummary,
  AeroWorktreeSummary,
} from '@/server/services/harness/types';

export interface SubWorktreeItemProps {
  idPrefix: string;
  worktree: AeroWorktreeSummary;
  workspace: AeroWorkspaceSummary;
}

const INITIAL_LIMIT = 3;
const LIMIT_INCREMENT = 5;

export const SubWorktreeItem = memo(function SubWorktreeItem({
  idPrefix,
  worktree,
  workspace,
}: SubWorktreeItemProps) {
  const worktreeItemId = `${idPrefix}-wt-${worktree.id}`;

  const [limit, setLimit] = useState(INITIAL_LIMIT);

  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } = useSessions({
    directory: worktree.directory,
    initialSessions: [],
    limit,
  });

  const rawSessions = data?.pages.flatMap((page) => page.items) ?? [];
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
          <WorkspaceNewSessionButton
            workspace={workspace}
            worktree={worktree}
          />
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
                <CopyDirectoryPath directory={worktree.directory} />
                <Separator className='my-0.5 h-[0.5px]' />
                <DeleteWorktree
                  worktreeName={worktree.name}
                  worktreeDirectory={worktree.directory}
                  workspaceDirectory={workspace.directory}
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
            className='group [--sidebar-menu-guide-count:1] [--sidebar-menu-item-offset:16px]'
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
