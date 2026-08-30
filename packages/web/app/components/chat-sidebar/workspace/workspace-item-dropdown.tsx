import { EllipsisVertical } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { create } from 'zustand';

import { Dropdown, Separator } from '@aero/ui';

import {
  CopyDirectoryPath,
  DeleteWorkspace,
  EditWorkspace,
} from '@/app/components/chat-sidebar/workspace/workspace-actions';
import { useGitErrorCode } from '@/app/hooks/api/git';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

interface WorkspaceItemDropdownState {
  dropdownOpen: string;
  setDropdownOpen: (open: string) => void;
}

export const useWorkspaceItemDropdownStore = create<WorkspaceItemDropdownState>(
  (set) => ({
    dropdownOpen: '',
    setDropdownOpen: (open) => set({ dropdownOpen: open }),
  }),
);

export function WorkspaceItemDropdown({
  workspace,
}: {
  workspace: AeroWorkspaceSummary;
}) {
  const { data: errorCode } = useGitErrorCode(workspace.directory);

  const dropdownOpen = useWorkspaceItemDropdownStore(
    (state) => state.dropdownOpen === workspace.directory,
  );

  const setDropdownOpen = useWorkspaceItemDropdownStore(
    (state) => state.setDropdownOpen,
  );

  const directoryNotFound = errorCode?.code === 'DIRECTORY_NOT_FOUND';

  return (
    <Dropdown
      size='sm'
      isOpen={dropdownOpen}
      onOpenChange={(open) => setDropdownOpen(!open ? '' : workspace.directory)}
    >
      <Dropdown.Trigger
        aria-label={`More actions for ${workspace.name}`}
        className='sidebar__menu-action group'
        data-slot='sidebar-menu-action'
      >
        <div className='relative'>
          {directoryNotFound && (
            <div className='bg-danger absolute -top-0.75 -right-0.75 size-1 rounded-full' />
          )}
          <Icon
            data={EllipsisVertical}
            className='opacity-50 transition-opacity group-hover:opacity-80'
            style={{
              width: 12,
              height: 12,
            }}
          />
        </div>
      </Dropdown.Trigger>
      <Dropdown.Popover className='w-44' crossOffset={6} placement='bottom end'>
        <Dropdown.Menu aria-label={`${workspace.name} actions`}>
          <EditWorkspace
            workspace={workspace}
            directoryNotFound={directoryNotFound}
          />
          <CopyDirectoryPath directory={workspace.directory} />
          <Separator className='my-0.5' />
          <DeleteWorkspace
            workspaceId={workspace.id}
            workspaceName={workspace.name}
          />
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
