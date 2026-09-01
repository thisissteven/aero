import { Check, Folder, Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useRef } from 'react';

import { Dropdown, Label, Separator, Spinner } from '@aero/ui';

import { FolderPicker } from '@/app/components/folder-picker';
import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import {
  useCreateWorkspace,
  useWorkspacesCompact,
} from '@/app/hooks/api/workspaces';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { getLastPathName } from '@/app/lib/file';
import { useGlobalModalStore } from '@/app/providers';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';
import { normalizePath } from '@/server/shared';

export function WorkspacesDropdown() {
  const workspacesQuery = useWorkspacesCompact();

  const { mutateAsync: createWorkspace } = useCreateWorkspace();

  const listRef = useRef<HTMLDivElement | null>(null);

  const {
    items: workspaces,
    loadMoreRef,
    hasNextPage,
  } = useInfiniteScroll<AeroWorkspaceSummary>(workspacesQuery, {
    rootRef: listRef,
  });

  const selectedWorkspace = useNewSessionStore(
    (state) => state.selectedWorkspace,
  );

  const setSelectedWorkspace = useNewSessionStore(
    (state) => state.setSelectedWorkspace,
  );

  const openModal = useGlobalModalStore((state) => state.openModal);

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
      <Dropdown.Popover
        className='w-44 overflow-x-hidden max-sm:min-w-44'
        placement='top start'
      >
        <Dropdown.Menu>
          <Dropdown.Item
            onPress={() => {
              openModal({
                children: (
                  <FolderPicker
                    onSelect={(path) => {
                      setSelectedWorkspace({
                        id: path,
                        name: getLastPathName(path),
                        directory: normalizePath(path),
                        worktrees: [],
                        createdAt: Date.now(),
                        updatedAt: Date.now(),
                      });
                      createWorkspace({
                        name: getLastPathName(path),
                        directory: normalizePath(path),
                      });
                    }}
                  />
                ),
              });
            }}
          >
            <Icon size={14} data={Plus} className='shrink-0' />
            <Label>new project</Label>
          </Dropdown.Item>
        </Dropdown.Menu>
        <Separator className='!ms-0 !w-[calc(100%+8px)] -translate-x-1' />
        <div className='max-h-[min(190px,40vh)] scrollbar-thin overflow-y-auto'>
          <Dropdown.Menu aria-label='List of workspaces'>
            {workspaces.map((workspace) => {
              return (
                <Dropdown.Item
                  key={workspace.id}
                  className='justify-between gap-1'
                  onPress={() => setSelectedWorkspace(workspace)}
                >
                  <div className='flex items-center gap-1'>
                    <Icon size={14} data={Folder} className='shrink-0' />
                    <Label>{workspace.name}</Label>
                  </div>
                  {selectedWorkspace?.directory === workspace.directory && (
                    <Icon size={14} data={Check} className='shrink-0' />
                  )}
                </Dropdown.Item>
              );
            })}
            {hasNextPage && (
              <Dropdown.Item
                textValue='__sentinel__'
                ref={loadMoreRef}
                isDisabled
                className='flex h-[36px] items-center justify-center py-2 text-sm aria-selected:bg-transparent'
              >
                <div className='flex items-center justify-center'>
                  <Spinner className='text-muted size-4' />
                </div>
              </Dropdown.Item>
            )}
          </Dropdown.Menu>
        </div>
      </Dropdown.Popover>
    </Dropdown>
  );
}
