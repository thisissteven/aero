import { CircleTree, Folder, Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useId, useMemo } from 'react';

import { Sidebar } from '@aero/ui';

import {
  ChatSidebarSessionItem,
  WorkspaceSessionItem,
} from '@/app/components/chat-sidebar/session-item';
import {
  AeroWorkspaceSummary,
  AeroWorktreeSummary,
} from '@/server/services/harness/types';

interface ChatSidebarWorkspaceItemProps {
  idPrefix: string;
  pathname: string;
  workspace: AeroWorkspaceSummary;
}

// Helper to check if a specific session matches the active pathname
const isSessionActive = (pathname: string, sessionId: string) =>
  pathname === `/sessions/${sessionId}`;

// Helper to check if ANY session inside ANY worktree in this workspace is active
const containsActiveSession = (
  pathname: string,
  workspace: AeroWorkspaceSummary,
) =>
  workspace.worktrees.some((worktree) =>
    worktree.sessions.some((session) => isSessionActive(pathname, session.id)),
  );

// Dedupe by id, keeping the first occurrence. This guards against upstream
// pagination ("show more sessions") returning a page that overlaps with
// sessions already loaded — duplicate ids inside the same Sidebar collection
// cause its internal collection state to thrash on every render, which shows
// up as "Maximum update depth exceeded" the moment that node expands.
export function dedupeById<T extends { id: string | number }>(items: T[]): T[] {
  const seen = new Set<string>();
  const out: T[] = [];
  for (const item of items) {
    const key = String(item.id);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
}

// Dedupe worktrees by *directory*, not just id. The original code picked
// `root` by matching `directory`, but filtered non-root worktrees by `id` —
// two different keys for the same concept. If the backend ever emits two
// worktree records pointing at the same directory (stale entry, race on
// worktree add/remove, etc.) the old logic would silently render both:
// once folded into "root" sessions, once again as a full worktree branch,
// with colliding derived ids. Keying everything off directory make both the
// root pick and the exclusion filter agree.
export function dedupeWorktreesByDirectory(
  worktrees: AeroWorktreeSummary[],
): AeroWorktreeSummary[] {
  const seen = new Set<string>();
  const out: AeroWorktreeSummary[] = [];
  for (const worktree of worktrees) {
    if (seen.has(worktree.directory)) continue;
    seen.add(worktree.directory);
    out.push(worktree);
  }
  return out;
}

export const ChatSidebarWorkspaceItem = memo(
  function ChatSidebarWorkspaceItem({
    idPrefix,
    pathname,
    workspace,
    ...props
  }: ChatSidebarWorkspaceItemProps) {
    const uniqueId = useId();

    // All the sanitizing happens here, once, before anything downstream
    // touches ids. Nothing below this needs to know the raw data might be
    // messy.
    const { root, otherWorktrees } = useMemo(() => {
      const cleanWorktrees = dedupeWorktreesByDirectory(
        workspace.worktrees,
      ).map((worktree) => ({
        ...worktree,
        sessions: dedupeById(worktree.sessions),
      }));

      const rootWorktree = cleanWorktrees.find(
        (worktree) => worktree.directory === workspace.directory,
      );

      const others = rootWorktree
        ? cleanWorktrees.filter(
            (worktree) => worktree.directory !== rootWorktree.directory,
          )
        : cleanWorktrees;

      return { root: rootWorktree, otherWorktrees: others };
    }, [workspace]);

    if (!root) return null;

    const hasSessions = root.sessions.length > 0;

    // Single stable id namespace for this whole item. Every descendant id
    // below is `${workspaceIdPrefix}-...-<stableEntityId>` — exactly one
    // `uniqueId`, never re-appended, so nothing can accidentally collide
    // with a sibling that happens to share an entity id under a different
    // prefix.
    const workspaceIdPrefix = `${idPrefix}-${uniqueId}-${workspace.id}`;

    return (
      <Sidebar.MenuItem
        {...props}
        id={workspaceIdPrefix}
        textValue={root.name}
        className='group'
      >
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
              id={`${workspaceIdPrefix}-empty-root`}
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
              idPrefix={`${workspaceIdPrefix}-root`}
              pathname={pathname}
              session={session}
              isWorktreeItem
              from='workspaces'
            />
          ))}

          {root.hasMoreSessions && (
            <Sidebar.MenuItem
              id={`${workspaceIdPrefix}-show-more-root`}
              textValue='show more sessions'
              className='group'
            >
              <Sidebar.MenuItemContent className='bg-transparent group-hover:bg-transparent'>
                <button className='text-muted hover:text-foreground text-xs'>
                  Show more sessions
                </button>
              </Sidebar.MenuItemContent>
            </Sidebar.MenuItem>
          )}

          {otherWorktrees.map((worktree) => {
            const worktreeHasSessions = worktree.sessions.length > 0;
            const worktreeItemId = `${workspaceIdPrefix}-wt-${worktree.id}`;

            return (
              <Sidebar.MenuItem
                key={worktree.id}
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
                  {!worktreeHasSessions && (
                    <Sidebar.MenuItem
                      id={`${worktreeItemId}-empty`}
                      textValue='Empty session'
                      isDisabled
                      className='h-6 -translate-x-4 before:opacity-0'
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
                      idPrefix={worktreeItemId}
                      pathname={pathname}
                      session={session}
                      from='workspaces'
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
    if (
      prev.idPrefix !== next.idPrefix ||
      prev.workspace.id !== next.workspace.id
    ) {
      return false;
    }

    const prevHasActive = containsActiveSession(prev.pathname, prev.workspace);
    const nextHasActive = containsActiveSession(next.pathname, next.workspace);

    if (prevHasActive || nextHasActive) {
      return prev.pathname === next.pathname;
    }

    return prev.workspace === next.workspace;
  },
);
