import { useParams } from '@tanstack/react-router';
import { useEffect } from 'react';

import { Button, Modal, Separator, toast } from '@aero/ui';

import { sessionKeys } from '@/app/hooks/api/sessions';
import { useUpdateWorkspace } from '@/app/hooks/api/workspaces';
import { queryClient, useGlobalModalStore } from '@/app/providers';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

import { EditWorkspaceActions } from './edit-workspace-actions';
import { EditWorkspaceAccentColorPicker } from './edit-workspace-color-picker';
import { EditWorkspaceDirectoryInput } from './edit-workspace-directory-input';
import { EditWorkspaceIconPicker } from './edit-workspace-icon-picker';
import { EditWorkspaceModelDefaults } from './edit-workspace-model-defaults';
import { EditWorkspaceNameInput } from './edit-workspace-name-input';
import { useEditWorkspaceStore } from './edit-workspace-store';

export function EditWorkspaceModal({
  workspace,
  directoryNotFound,
}: {
  workspace: AeroWorkspaceSummary;
  directoryNotFound: boolean;
}) {
  const init = useEditWorkspaceStore((s) => s.init);

  useEffect(() => {
    init(workspace);
  }, [workspace, init]);

  const { mutateAsync: updateWorkspace, isPending } = useUpdateWorkspace(
    workspace.id,
  );

  const { sessionId } = useParams({ strict: false });

  const handleSave = () => {
    const { name, selectedColor, selectedIcon, defaultModel, directory } =
      useEditWorkspaceStore.getState();

    toast.promise(
      updateWorkspace({
        name,
        selectedColor,
        selectedIcon,
        defaultModel,
        directory,
      }),
      {
        error: 'Failed to save changes',
        loading: 'Saving changes...',
        success: () => {
          queryClient.invalidateQueries({
            queryKey: sessionKeys.detail(undefined, sessionId),
          });
          return 'Changes saved successfully';
        },
      },
    );
  };

  return (
    <Modal.Dialog className='px-0 sm:max-w-[480px] lg:max-w-[560px]'>
      <Modal.CloseTrigger />
      <Modal.Header className='px-4 sm:px-5'>
        <Modal.Heading>Edit Workspace</Modal.Heading>
      </Modal.Header>

      <Modal.Body
        className='flex flex-col gap-5 px-5 sm:px-6'
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey && !isPending) {
            e.preventDefault();
            handleSave();
          }
        }}
      >
        <EditWorkspaceNameInput />
        <EditWorkspaceDirectoryInput directoryNotFound={directoryNotFound} />

        <Separator />

        <div className='flex flex-col gap-4'>
          <EditWorkspaceModelDefaults />
          <EditWorkspaceAccentColorPicker />
          <EditWorkspaceIconPicker />
        </div>

        <Separator />

        <EditWorkspaceActions />
      </Modal.Body>

      <Modal.Footer className='px-6 sm:px-7'>
        <Button
          variant='ghost'
          size='sm'
          onPress={() => useGlobalModalStore.getState().closeModal()}
        >
          Cancel
        </Button>
        <Button
          variant='primary'
          size='sm'
          isPending={isPending}
          onPress={handleSave}
        >
          Save Changes
        </Button>
      </Modal.Footer>
    </Modal.Dialog>
  );
}
