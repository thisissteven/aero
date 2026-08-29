import { CircleTree } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Dropdown, Label } from '@aero/ui';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { useWorktrees } from '@/app/hooks/api/worktree';
import { getLastPathName } from '@/app/lib/file';

export function WorktreesDropdown() {
  const selectedWorkspace = useNewSessionStore(
    (state) => state.selectedWorkspace,
  );

  const { data: worktrees } = useWorktrees({
    harnessId: undefined,
    directory: selectedWorkspace?.directory,
  });

  const selectedWorktree = useNewSessionStore(
    (state) => state.selectedWorktree,
  );

  const setSelectedWorktree = useNewSessionStore(
    (state) => state.setSelectedWorktree,
  );

  if (!worktrees || worktrees.length === 0) return null;

  return (
    <Dropdown size='sm'>
      <Dropdown.Trigger
        aria-label='Select a worktree to work on'
        className='mt-1.5 ml-2'
      >
        <div className='flex items-center gap-1.5 text-xs'>
          <Icon
            data={CircleTree}
            className='opacity-50 transition-opacity hover:opacity-80'
            size={14}
          />
          <span>
            {selectedWorktree
              ? getLastPathName(selectedWorktree)
              : 'No worktree selected'}
          </span>
        </div>
      </Dropdown.Trigger>
      <Dropdown.Popover className='w-44 max-sm:min-w-44' placement='top start'>
        <Dropdown.Menu aria-label='List of worktrees'>
          {worktrees.map((worktree) => {
            return (
              <Dropdown.Item
                key={worktree}
                className='gap-1'
                onPress={() => setSelectedWorktree(worktree)}
              >
                <Icon size={14} data={CircleTree} className='shrink-0' />
                <Label>{getLastPathName(worktree)}</Label>
              </Dropdown.Item>
            );
          })}
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
