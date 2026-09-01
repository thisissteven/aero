import { Check, CircleTree, Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Dropdown, Label, Separator, toast } from '@aero/ui';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import {
  useGitCurrentBranch,
  useGitErrorCode,
  useGitWorktrees,
} from '@/app/hooks/api/git';
import { useCreateWorktree } from '@/app/hooks/api/worktree';
import { getLastPathName } from '@/app/lib/file';

export function WorktreesDropdown() {
  const selectedWorkspace = useNewSessionStore(
    (state) => state.selectedWorkspace?.directory,
  );

  const { data: worktrees = [], refetch } = useGitWorktrees(selectedWorkspace);

  const { mutateAsync: createNewWorktree } = useCreateWorktree();

  const { data: git } = useGitCurrentBranch(selectedWorkspace);
  const { data: error } = useGitErrorCode(selectedWorkspace);

  const selectedWorktree = useNewSessionStore(
    (state) => state.selectedWorktree,
  );

  const setSelectedWorktree = useNewSessionStore(
    (state) => state.setSelectedWorktree,
  );

  if (error?.code === 'INVALID_GIT_REPOSITORY') {
    return (
      <div className='text-muted flex items-end text-xs'>
        No git repository detected.
      </div>
    );
  } else if (error?.code === 'DIRECTORY_NOT_FOUND') {
    return (
      <div className='text-danger flex items-end text-xs'>
        Directory not found.
      </div>
    );
  }

  if (!git?.currentBranch || !selectedWorkspace) return null;

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
              : git.currentBranch}
          </span>
        </div>
      </Dropdown.Trigger>
      <Dropdown.Popover
        className='w-44 overflow-x-hidden max-sm:min-w-44'
        placement='top start'
      >
        <div>
          <Dropdown.Menu>
            <Dropdown.Item
              className='gap-1'
              onPress={() => {
                toast.promise(
                  createNewWorktree({
                    directory: selectedWorkspace,
                  }),
                  {
                    error: (err) => err.message,
                    loading: 'Creating new worktree...',
                    success: (data) => {
                      setSelectedWorktree(data?.directory);
                      refetch();
                      return 'Worktree created successfully';
                    },
                  },
                );
              }}
            >
              <Icon size={14} data={Plus} className='shrink-0' />
              <Label>new worktree</Label>
            </Dropdown.Item>
          </Dropdown.Menu>
          <Separator className='!ms-0 !w-[calc(100%+8px)] -translate-x-1' />
        </div>
        <div className='max-h-[min(190px,40vh)] scrollbar-thin overflow-y-auto'>
          <Dropdown.Menu aria-label='List of worktrees'>
            <Dropdown.Item
              className='justify-between gap-1'
              onPress={() => setSelectedWorktree(undefined)}
            >
              <div className='flex items-center gap-1'>
                <Icon size={14} data={CircleTree} className='shrink-0' />
                <Label>{git.currentBranch} (current)</Label>
              </div>
              {!selectedWorktree && (
                <Icon size={14} data={Check} className='shrink-0' />
              )}
            </Dropdown.Item>
            {worktrees?.map((worktree) => {
              if (worktree.branch === git.currentBranch) return null;
              return (
                <Dropdown.Item
                  key={worktree.directory}
                  className='justify-between gap-1'
                  onPress={() => setSelectedWorktree(worktree.directory)}
                >
                  <div className='flex items-center gap-1'>
                    <Icon size={14} data={CircleTree} className='shrink-0' />
                    <Label>{getLastPathName(worktree.directory)}</Label>
                  </div>
                  {selectedWorktree === worktree.directory && (
                    <Icon size={14} data={Check} className='shrink-0' />
                  )}
                </Dropdown.Item>
              );
            })}
          </Dropdown.Menu>
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}
