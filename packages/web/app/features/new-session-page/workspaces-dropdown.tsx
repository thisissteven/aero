import { Folder } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Dropdown, Label } from '@aero/ui';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { useWorkspaces } from '@/app/hooks/api/workspaces';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

export function WorkspacesDropdown() {
  const workspacesQuery = useWorkspaces();

  const {
    items: workspaces,
    loadMoreRef,
    hasNextPage,
  } = useInfiniteScroll<AeroWorkspaceSummary>(workspacesQuery, {
    // search: debouncedSearch,
    // rootRef: listRef,
    limitWithoutSearch: 5,
  });

  const selectedWorkspace = useNewSessionStore(
    (state) => state.selectedWorkspace,
  );

  const setSelectedWorkspace = useNewSessionStore(
    (state) => state.setSelectedWorkspace,
  );

  if (!workspaces || workspaces.length === 0) return null;

  return (
    <Dropdown size='sm'>
      <Dropdown.Trigger
        aria-label='Select a workspace to work on'
        className='mt-1.5 ml-2'
      >
        <div className='flex items-center gap-1.5 text-xs'>
          <Icon
            data={Folder}
            className='opacity-50 transition-opacity hover:opacity-80'
            size={14}
          />
          <span>{selectedWorkspace?.name ?? 'Choose Project'}</span>
        </div>
      </Dropdown.Trigger>
      <Dropdown.Popover className='w-44 max-sm:min-w-44' placement='top start'>
        <Dropdown.Menu aria-label='List of workspaces'>
          {workspaces.map((workspace) => {
            return (
              <Dropdown.Item
                key={workspace.id}
                className='gap-1'
                onPress={() => setSelectedWorkspace(workspace)}
              >
                <Icon size={14} data={Folder} className='shrink-0' />
                <Label>{workspace.name}</Label>
              </Dropdown.Item>
            );
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
