import { Folder } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useMemo } from 'react';

import { Sidebar } from '@aero/ui';

import { DirectoryNotFoundIndicator } from '@/app/components/chat-sidebar/workspace/directory-not-found-indicator';
import {
  ACCENT_COLORS_MAP,
  PROJECT_ICON_MAP,
} from '@/app/components/chat-sidebar/workspace/edit-workspace-modal';
import { RootWorktreeItem } from '@/app/components/chat-sidebar/workspace/root-worktree-item';
import { SubWorktreeItem } from '@/app/components/chat-sidebar/workspace/sub-worktree-item';
import { WorkspaceItemDropdown } from '@/app/components/chat-sidebar/workspace/workspace-item-dropdown';
import { WorkspaceNewSessionButton } from '@/app/components/chat-sidebar/workspace/workspace-new-session-button';
import {
  AeroWorkspaceSummary,
  AeroWorktreeSummary,
} from '@/server/services/harness/types';

interface ChatSidebarWorkspaceItemProps {
  idPrefix: string;
  workspace: AeroWorkspaceSummary;
}

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

export const ChatSidebarWorkspaceItem = memo(function ChatSidebarWorkspaceItem({
  idPrefix,
  workspace,
  ...props
}: ChatSidebarWorkspaceItemProps) {
  const { root, otherWorktrees } = useMemo(() => {
    const cleanWorktrees = dedupeWorktreesByDirectory(workspace.worktrees);

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

  const workspaceIdPrefix = `${idPrefix}-${workspace.id}`;

  const isCustomIcon =
    !PROJECT_ICON_MAP[workspace.selectedIcon as keyof typeof PROJECT_ICON_MAP];

  return (
    <Sidebar.MenuItem
      {...props}
      id={workspaceIdPrefix}
      textValue={root.name}
      className='group'
    >
      <Sidebar.MenuItemContent className='relative flex-1 gap-2 bg-transparent group-hover:bg-transparent'>
        <Sidebar.MenuIcon className='relative shrink-0 transition group-hover:opacity-0'>
          {!workspace.selectedIcon ? (
            <Icon data={Folder} size={14} />
          ) : isCustomIcon ? (
            <img
              src={workspace.selectedIcon}
              alt={workspace.name}
              className='size-3.5'
            />
          ) : (
            <Icon
              data={
                PROJECT_ICON_MAP[
                  workspace.selectedIcon as keyof typeof PROJECT_ICON_MAP
                ]
              }
              style={{
                color:
                  ACCENT_COLORS_MAP[
                    workspace.selectedColor as keyof typeof ACCENT_COLORS_MAP
                  ],
              }}
              size={14}
            />
          )}
        </Sidebar.MenuIcon>

        <Sidebar.MenuTrigger className='absolute inset-0 flex h-full w-full items-center justify-start pl-3 opacity-0 transition group-hover:opacity-100'>
          <Sidebar.MenuIndicator />
        </Sidebar.MenuTrigger>

        <Sidebar.MenuLabel>{workspace.name}</Sidebar.MenuLabel>

        <DirectoryNotFoundIndicator directory={workspace.directory} />

        <Sidebar.MenuActions className='ml-auto translate-x-1.5'>
          <WorkspaceNewSessionButton
            workspace={workspace}
            worktree={undefined}
          />
          <WorkspaceItemDropdown workspace={workspace} />
        </Sidebar.MenuActions>
      </Sidebar.MenuItemContent>

      <Sidebar.Submenu>
        <RootWorktreeItem idPrefix={workspaceIdPrefix} worktree={root} />

        {otherWorktrees.map((worktree) => (
          <SubWorktreeItem
            key={worktree.id}
            idPrefix={workspaceIdPrefix}
            worktree={worktree}
            workspace={workspace}
          />
        ))}
      </Sidebar.Submenu>
    </Sidebar.MenuItem>
  );
});
