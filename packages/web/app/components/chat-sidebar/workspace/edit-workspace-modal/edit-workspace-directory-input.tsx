import { Folder } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { cn, Input, Label } from '@aero/ui';

import { FolderPicker } from '@/app/components/folder-picker';
import { IconButton } from '@/app/components/ui/icon-button';
import { useGlobalModalStoreOuter } from '@/app/providers';

import { useEditWorkspaceStore } from './edit-workspace-store';

export function EditWorkspaceDirectoryInput({
  directoryNotFound,
}: {
  directoryNotFound: boolean;
}) {
  const directory = useEditWorkspaceStore((s) => s.directory);
  const initialDirectory = useEditWorkspaceStore((s) => s.workspace.directory);
  const setDirectory = useEditWorkspaceStore((s) => s.setDirectory);

  return (
    <div className='flex flex-col gap-2'>
      <Label className='font-medium'>Project Directory</Label>
      <div className='relative flex w-full items-center gap-2'>
        <Input
          value={directory}
          placeholder='Enter project directory'
          className='pointer-events-none w-full opacity-50'
          readOnly
        />
        <IconButton
          onPress={() =>
            useGlobalModalStoreOuter.getState().openModal({
              children: (
                <FolderPicker
                  onSelect={(path) => {
                    setDirectory(path);
                  }}
                  onClose={() => {
                    useGlobalModalStoreOuter.getState().closeModal();
                  }}
                />
              ),
            })
          }
          isDisabled
          variant='ghost'
          className='text-foreground shrink-0'
        >
          <Icon data={Folder} className='text-foreground' />
        </IconButton>
      </div>
      <span
        className={cn(
          'ml-3.5 text-xs',
          directoryNotFound ? 'text-danger' : 'text-success',
          directory !== initialDirectory && 'text-warning',
        )}
      >
        {directory !== initialDirectory &&
          'Warning: all worktrees associated to the previous directory will be ignored.'}
        {directory === initialDirectory &&
          `Directory status: ${directoryNotFound ? 'not found' : 'valid'}`}
      </span>
    </div>
  );
}
