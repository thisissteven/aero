import { CircleTree, Folder, Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useMemo } from 'react';

import { Sidebar } from '@aero/ui';

import {
  ChatSidebarSessionItem,
  WorkspaceSessionItem,
} from '@/app/components/chat-sidebar/session-item';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

interface ChatSidebarWorkspaceItemProps {
  idPrefix: string;
  pathname: string;
  workspace: AeroWorkspaceSummary;
}

// Helper to check if a specific session matches the active pathname
const isSessionActive = (pathname: string, sessionId: string) =>
  pathname === `/sessions/${sessionId}` ||
  pathname === sessionId ||
  pathname === `/${sessionId}`;

// Helper to check if ANY session inside ANY worktree in this workspace is active
const containsActiveSession = (
  pathname: string,
  workspace: AeroWorkspaceSummary,
) =>
  workspace.worktrees.some((worktree) =>
    worktree.sessions.some((session) => isSessionActive(pathname, session.id)),
  );

export const ChatSidebarWorkspaceItem = memo(
  function ChatSidebarWorkspaceItem({
    idPrefix,
    pathname,
    workspace,
  }: ChatSidebarWorkspaceItemProps) {
    const root = useMemo(() => {
      return workspace.worktrees.find(
        (worktree) => worktree.directory === workspace.directory,
      );
    }, [workspace]);

    if (!root) return null;

    const hasSessions = root.sessions.length > 0;

    return (
      <Sidebar.MenuItem id={root.id} textValue={root.name} className='group'>
        <Sidebar.MenuItemContent className='relative flex-1 gap-2 bg-transparent group-hover:bg-transparent'>
          <Sidebar.MenuIcon className='relative shrink-0 transition group-hover:opacity-0'>
            <Icon data={Folder} size={14} />
          </Sidebar.MenuIcon>

          <Sidebar.MenuTrigger className='absolute inset-0 flex h-full w-full items-center justify-start pl-3 opacity-0 transition group-hover:opacity-100'>
            <Sidebar.MenuIndicator />
          </Sidebar.MenuTrigger>

          <Sidebar.MenuLabel>{root.name}</Sidebar.MenuLabel>

          <Sidebar.MenuActions className='ml-auto translate-x-1.5'>
            <Sidebar.MenuAction
              aria-label='Actions'
              className='group'
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
              }}
            >
              <Icon
                data={Plus}
                className='opacity-50 transition-opacity group-hover:opacity-80'
                style={{
                  width: 12,
                  height: 12,
                }}
              />
            </Sidebar.MenuAction>
          </Sidebar.MenuActions>
        </Sidebar.MenuItemContent>

        <Sidebar.Submenu>
          {!hasSessions && (
            <Sidebar.MenuItem
              id={`empty-${root.id}`}
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

          {root.sessions.map((session) => (
            <ChatSidebarSessionItem
              key={session.id}
              idPrefix='workspace-root'
              pathname={pathname}
              session={session}
            />
          ))}

          {workspace.worktrees.map((worktree) => {
            const isRootWorktree = worktree.id == root.id;

            if (isRootWorktree) return null;

            const hasSessions = worktree.sessions.length > 0;

            return (
              <Sidebar.MenuItem
                key={worktree.id}
                id={worktree.id}
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
                      }}
                    >
                      <Icon
                        data={Plus}
                        className='opacity-50 transition-opacity group-hover:opacity-80'
                        style={{
                          width: 12,
                          height: 12,
                        }}
                      />
                    </Sidebar.MenuAction>
                  </Sidebar.MenuActions>
                </Sidebar.MenuItemContent>

                <Sidebar.Submenu>
                  {!hasSessions && (
                    <Sidebar.MenuItem
                      id={`empty-${worktree.id}`}
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
                  {worktree.sessions.map((session) => (
                    <WorkspaceSessionItem
                      key={session.id}
                      idPrefix='workspace-worktree'
                      pathname={pathname}
                      session={session}
                      isWorktreeItem
                    />
                  ))}
                </Sidebar.Submenu>
              </Sidebar.MenuItem>
            );
          })}
        </Sidebar.Submenu>
      </Sidebar.MenuItem>
    );
  },
  (prev, next) => {
    // 1. Re-render if workspace data or idPrefix changed
    if (
      prev.idPrefix !== next.idPrefix ||
      prev.workspace.id !== next.workspace.id ||
      prev.workspace !== next.workspace
    ) {
      return false;
    }

    // 2. Check if previous or next route touches any session in this workspace
    const prevHasActive = containsActiveSession(prev.pathname, prev.workspace);
    const nextHasActive = containsActiveSession(next.pathname, next.workspace);

    // If this workspace contained the active session in `prev` OR contains it in `next`,
    // any pathname change requires a re-render.
    if (prevHasActive || nextHasActive) {
      return prev.pathname === next.pathname;
    }

    // If neither prev nor next pathname points to a session in this workspace,
    // skip re-rendering on pathname changes.
    return true;
  },
);
