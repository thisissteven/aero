import { cn, IconButton, Input, Label } from '@aero/ui';
import { Folder } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { FolderPicker } from '@/app/components/folder-picker';
import { useI18n } from '@/app/hooks/i18n';
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

  const { t } = useI18n();

  return (
    <div className='flex flex-col gap-2'>
      <Label className='font-medium'>{t.editWorkspace.projectDirectory}</Label>
      <div className='relative flex w-full items-center gap-2'>
        <Input
          variant='secondary'
          value={directory}
          placeholder={t.editWorkspace.projectDirectoryPlaceholder}
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
        {directory !== initialDirectory && t.editWorkspace.directoryWarning}
        {directory === initialDirectory &&
          t.editWorkspace.directoryStatus(
            directoryNotFound
              ? t.editWorkspace.directoryNotFound
              : t.editWorkspace.directoryValid,
          )}
      </span>
    </div>
  );
}
