import { Folder } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useMemo } from 'react';

import { Sidebar } from '@aero/ui';

import { DirectoryNotFoundIndicator } from '@/app/components/chat-sidebar/workspace/directory-not-found-indicator';
import {
  ACCENT_COLORS_MAP,
  PROJECT_ICON_MAP,
} from '@/app/components/chat-sidebar/workspace/edit-workspace-modal/edit-workspace-constants';
import { RootWorktreeItem } from '@/app/components/chat-sidebar/workspace/root-worktree-item';
import { SubWorktreeItem } from '@/app/components/chat-sidebar/workspace/sub-worktree-item';
import { WorkspaceItemDropdown } from '@/app/components/chat-sidebar/workspace/workspace-item-dropdown';
import { WorkspaceNewSessionButton } from '@/app/components/chat-sidebar/workspace/workspace-new-session-button';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';
import { dedupeWorktreesByDirectory } from '@/server/shared';

interface ChatSidebarWorkspaceItemProps {
  idPrefix: string;
  workspace: AeroWorkspaceSummary;
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
      <Sidebar.MenuItemContent className='relative flex-1 gap-2 bg-transparent pl-0 group-hover:bg-transparent'>
        <Sidebar.MenuIcon className='relative shrink-0 transition group-hover:opacity-0'>
          {!workspace.selectedIcon ? (
            <Icon
              data={Folder}
              size={14}
              style={{
                color:
                  ACCENT_COLORS_MAP[
                    workspace.selectedColor as keyof typeof ACCENT_COLORS_MAP
                  ] ?? workspace.selectedColor,
              }}
            />
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
                  ] ?? workspace.selectedColor,
              }}
              size={14}
            />
          )}
        </Sidebar.MenuIcon>

        <Sidebar.MenuTrigger className='absolute inset-0 flex h-full w-full items-center justify-start pl-1 opacity-0 transition group-hover:opacity-100'>
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
