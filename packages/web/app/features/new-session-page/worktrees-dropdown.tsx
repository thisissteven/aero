import {
  Button,
  Dropdown,
  Input,
  Label,
  Modal,
  Separator,
  TextField,
  toast,
} from '@aero/ui';
import { Check, CircleTree, Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import {
  useGitCurrentBranch,
  useGitErrorCode,
  useGitWorktrees,
} from '@/app/hooks/api/git';
import { workspaceKeys } from '@/app/hooks/api/workspaces';
import { useCreateWorktree } from '@/app/hooks/api/worktree';
import { useI18n } from '@/app/hooks/i18n';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { getLastPathName } from '@/app/lib/file';
import { queryClient } from '@/app/providers';

export function WorktreesDropdown() {
  const { t } = useI18n();

  const selectedWorkspace = useNewSessionStore(
    (state) => state.selectedWorkspace?.directory,
  );

  const selectedWorkspaceId = useNewSessionStore(
    (state) => state.selectedWorkspace?.id,
  );

  const { data: worktrees = [], refetch } = useGitWorktrees(selectedWorkspace);

  const { mutateAsync: createNewWorktree, isPending: isCreatingWorktree } =
    useCreateWorktree();

  const { data: git } = useGitCurrentBranch(selectedWorkspace);
  const { data: error } = useGitErrorCode(selectedWorkspace);

  const [isCreateOpen, setCreateOpen] = useState(false);
  const [name, setName] = useState('');

  const handleCreateNamed = async () => {
    if (!selectedWorkspace || !selectedWorkspaceId) return;
    try {
      const data = await createNewWorktree({
        directory: selectedWorkspace,
        name: name.trim() || undefined,
      });
      setSelectedWorktree(data?.directory);
      queryClient.invalidateQueries({
        queryKey: workspaceKeys.detail(selectedWorkspaceId),
      });
      refetch();
      toast.success(t.workspace.worktreeCreated);
      setName('');
      setCreateOpen(false);
    } catch (err) {
      toast.danger(
        err instanceof Error ? err.message : t.apiErrors.failedToCreateWorktree,
      );
    }
  };

  const selectedWorktree = useNewSessionStore(
    (state) => state.selectedWorktree,
  );

  const setSelectedWorktree = useNewSessionStore(
    (state) => state.setSelectedWorktree,
  );

  useKeyPress(
    'Q',
    () => {
      if (selectedWorkspace && selectedWorkspaceId) {
        toast.promise(
          createNewWorktree({
            directory: selectedWorkspace,
          }),
          {
            error: (err) => err.message,
            loading: t.workspace.creatingNewWorktree,
            success: (data) => {
              setSelectedWorktree(data?.directory);
              queryClient.invalidateQueries({
                queryKey: workspaceKeys.detail(selectedWorkspaceId),
              });
              refetch();
              return t.workspace.worktreeCreated;
            },
          },
        );
      }
    },
    {
      preventDefault: true,
      stopPropagation: true,
      ignoreInputs: false,
      modifiers: {
        mod: true,
        shift: true,
      },
    },
  );

  if (error?.code === 'INVALID_GIT_REPOSITORY') {
    return (
      <div className='text-muted flex items-end text-xs'>
        {t.workspace.noGitRepository}
      </div>
    );
  } else if (error?.code === 'DIRECTORY_NOT_FOUND') {
    return (
      <div className='text-danger flex items-end text-xs'>
        {t.workspace.directoryNotFound}
      </div>
    );
  }

  if (!git?.currentBranch || !selectedWorkspace || !selectedWorkspaceId)
    return null;

  return (
    <>
      <Dropdown size='sm'>
        <Dropdown.Trigger
          aria-label={t.workspace.selectWorktreeAria}
          className='mt-1.5 ml-1'
        >
          <div className='flex items-center gap-1 text-xs'>
            <Icon data={CircleTree} size={14} />
            <span>
              {selectedWorktree
                ? getLastPathName(selectedWorktree)
                : git.currentBranch}
            </span>
          </div>
        </Dropdown.Trigger>
        <Dropdown.Popover
          className='max-w-80 overflow-x-hidden max-sm:min-w-44'
          placement='top start'
          crossOffset={-8}
        >
          <div>
            <Dropdown.Menu>
              <Dropdown.Item
                className='gap-1'
                onPress={() => setCreateOpen(true)}
              >
                <Icon size={14} data={Plus} className='shrink-0' />
                <Label>{t.workspace.newWorktree}</Label>
              </Dropdown.Item>
            </Dropdown.Menu>
            <Separator className='!ms-0 !w-[calc(100%+8px)] -translate-x-1' />
          </div>
          <div className='max-h-[min(190px,40vh)] scrollbar-thin overflow-y-auto'>
            <Dropdown.Menu aria-label={t.workspace.listOfWorktreesAria}>
              <Dropdown.Item
                className='justify-between gap-1'
                onPress={() => setSelectedWorktree(undefined)}
              >
                <div className='flex items-center gap-1'>
                  <Icon size={14} data={CircleTree} className='shrink-0' />
                  <Label>{t.workspace.currentBranch(git.currentBranch)}</Label>
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

      <Modal isOpen={isCreateOpen} onOpenChange={setCreateOpen}>
        <Modal.Backdrop>
          <Modal.Container>
            <Modal.Dialog>
              {({ close }) => (
                <>
                  <Modal.Header>{t.workspace.newWorktree}</Modal.Header>
                  <Modal.Body>
                    <TextField>
                      <Label>{t.workspace.worktreeName}</Label>
                      <Input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder={t.workspace.worktreeNamePlaceholder}
                      />
                    </TextField>
                  </Modal.Body>
                  <Modal.Footer>
                    <Button size='sm' variant='ghost' onPress={close}>
                      {t.common.cancel}
                    </Button>
                    <Button
                      size='sm'
                      variant='primary'
                      onPress={handleCreateNamed}
                      isPending={isCreatingWorktree}
                    >
                      {t.common.create}
                    </Button>
                  </Modal.Footer>
                </>
              )}
            </Modal.Dialog>
          </Modal.Container>
        </Modal.Backdrop>
      </Modal>
    </>
  );
}
