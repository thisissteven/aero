import { Archive, Check, Copy, Pencil, TrashBin } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from '@tanstack/react-router';
import { useRef } from 'react';

import { Button, Checkbox, Dropdown, Label, Modal, toast } from '@aero/ui';

import {
  ArchiveBulkSessionsConfirmationModal,
  DeleteBulkSessionsConfirmationModal,
  getCheckboxVariant,
} from '@/app/components/chat-sidebar/session/session-actions';
import { useWorkspacesSidebarStore } from '@/app/components/chat-sidebar/sidebar-store';
import { CollapsibleActions } from '@/app/components/collapsible-actions';
import { sessionKeys, SessionsPageResponse } from '@/app/hooks/api/sessions';
import { useDeleteWorkspace } from '@/app/hooks/api/workspaces';
import { useDeleteWorktree } from '@/app/hooks/api/worktree';
import { useCopyToClipboard } from '@/app/hooks/useCopyToClipboard';
import { copyButtonCss } from '@/app/lib/file';
import { queryClient, useGlobalModalStore, useTheme } from '@/app/providers';
import { AeroWorkspaceSummary } from '@/server/services/harness/types';

import { EditWorkspaceModal } from './edit-workspace-modal';

export function WorkspacesToggleEditModeButton() {
  const isEditMode = useWorkspacesSidebarStore((state) => state.isEditMode);
  const toggleIsEditMode = useWorkspacesSidebarStore(
    (state) => state.toggleisEditMode,
  );
  const openModal = useGlobalModalStore((state) => state.openModal);

  const { resolvedTheme } = useTheme();

  const variant = getCheckboxVariant(resolvedTheme);

  return (
    <CollapsibleActions
      expandBehavior='vertical'
      expandOrigin='trigger-right'
      gap={48}
      distance={56}
      open={isEditMode}
      flip
    >
      <CollapsibleActions.Trigger>
        <Checkbox
          name='edit-mode-workspaces'
          slot='selection'
          isSelected={isEditMode}
          onChange={toggleIsEditMode}
          variant={variant}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
          </Checkbox.Content>
        </Checkbox>
      </CollapsibleActions.Trigger>
      <CollapsibleActions.Contents>
        <Button
          variant='danger-soft'
          onPress={() => {
            const sessionIds =
              useWorkspacesSidebarStore.getState().selectedSessionIds;
            if (sessionIds.length > 0) {
              openModal({
                children: (
                  <DeleteBulkSessionsConfirmationModal
                    sessionIds={sessionIds}
                  />
                ),
              });
            }
          }}
          isIconOnly
        >
          <Icon size={14} data={TrashBin} />
        </Button>
        <Button
          variant='outline'
          onPress={() => {
            const sessionIds =
              useWorkspacesSidebarStore.getState().selectedSessionIds;
            if (sessionIds.length > 0) {
              openModal({
                children: (
                  <ArchiveBulkSessionsConfirmationModal
                    sessionIds={sessionIds}
                  />
                ),
              });
            }
          }}
          isIconOnly
        >
          <Icon size={14} data={Archive} />
        </Button>
      </CollapsibleActions.Contents>
    </CollapsibleActions>
  );
}

export function SelectWorkspaceSession({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const isShiftPressedRef = useRef(false);

  const isSelected = useWorkspacesSidebarStore((state) =>
    state.selectedSessionIds.includes(sessionId),
  );

  const toggleSessionSelection = useWorkspacesSidebarStore(
    (state) => state.toggleSessionSelection,
  );

  const getOrderedIds = (): string[] => {
    // 1. Pass only the root key prefix to match ALL variations fuzzily
    // (e.g., ['sessions', 'default', ...])
    const queries = queryClient.getQueriesData<
      InfiniteData<SessionsPageResponse>
    >({
      queryKey: [...sessionKeys.merged(), undefined, 'directory'],
    });

    return queries.flatMap(
      ([, data]) =>
        data?.pages?.flatMap((page) => page.items.map((item) => item.id)) ?? [],
    );
  };

  const handlePointerDownCapture = (e: React.PointerEvent) => {
    isShiftPressedRef.current = e.shiftKey;
    if (e.shiftKey) e.preventDefault();
  };

  const handleSelectionChange = () => {
    const isShiftPressed = isShiftPressedRef.current;
    isShiftPressedRef.current = false;

    let orderedIds: string[] = [];
    if (isShiftPressed) {
      orderedIds = getOrderedIds();
    }

    toggleSessionSelection(sessionId, isShiftPressed, orderedIds);
  };

  const { resolvedTheme } = useTheme();

  const variant = getCheckboxVariant(resolvedTheme);

  return (
    <div
      className='select-none'
      onPointerDownCapture={handlePointerDownCapture}
      onClick={(e) => e.stopPropagation()}
    >
      <Checkbox
        name={`session-${sessionId}`}
        slot='selection'
        isSelected={isSelected}
        onChange={handleSelectionChange}
        variant={variant}
        className="dark:group-hover:[&_[data-slot='checkbox-control']]:!bg-field dark:group-hover:[&_[data-slot='checkbox-control']]:!shadow-field dark:group-data-[current=true]:[&_[data-slot='checkbox-control']]:!bg-field dark:group-data-[current=true]:[&_[data-slot='checkbox-control']]:!shadow-field"
      >
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
        </Checkbox.Content>
      </Checkbox>
    </div>
  );
}

function DeleteWorkspaceConfirmationModal({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const { mutateAsync } = useDeleteWorkspace();

  const navigate = useNavigate();

  return (
    <Modal.Dialog className='sm:max-w-[360px]'>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>Delete workspace?</Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        <p>
          <span className='text-foreground'>"{workspaceName}"</span> will be
          permanently deleted. All sessions under this workspace will also be
          archived.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button slot='close' variant='tertiary'>
          Cancel
        </Button>
        <Button
          slot='close'
          onPress={() => {
            toast.promise(mutateAsync(workspaceId), {
              loading: 'Deleting workspace...',
              error: (err) => err.message,
              success: (_data) => {
                navigate({
                  to: '/new',
                });
                return 'Workspace deleted';
              },
            });
          }}
          variant='danger'
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal.Dialog>
  );
}

export function DeleteWorkspace({
  workspaceId,
  workspaceName,
}: {
  workspaceId: string;
  workspaceName: string;
}) {
  const openModal = useGlobalModalStore((state) => state.openModal);

  return (
    <Dropdown.Item
      className='gap-1'
      variant='danger'
      onPress={() => {
        openModal({
          children: (
            <DeleteWorkspaceConfirmationModal
              workspaceId={workspaceId}
              workspaceName={workspaceName}
            />
          ),
        });
      }}
    >
      <Icon size={14} data={TrashBin} className='text-danger-soft-foreground' />
      <Label className='text-danger-soft-foreground! font-medium'>Delete</Label>
    </Dropdown.Item>
  );
}

function DeleteWorktreeConfirmationModal({
  worktreeDirectory,
  worktreeName,
  workspaceDirectory,
}: {
  worktreeDirectory: string;
  worktreeName: string;
  workspaceDirectory: string;
}) {
  const { sessionId } = useParams({ strict: false });

  const { mutateAsync } = useDeleteWorktree();

  return (
    <Modal.Dialog className='sm:max-w-[360px]'>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>Delete worktree?</Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        <p>
          <span className='text-foreground'>"{worktreeName}"</span> will be
          permanently deleted. All sessions under this worktree will also be
          read only.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button slot='close' variant='tertiary'>
          Cancel
        </Button>
        <Button
          slot='close'
          onPress={() => {
            toast.promise(
              mutateAsync({ directory: workspaceDirectory, worktreeDirectory }),
              {
                loading: 'Deleting worktree...',
                error: (err) => err.message,
                success: () => {
                  queryClient.invalidateQueries({
                    queryKey: sessionKeys.detail(undefined, sessionId),
                  });
                  return 'Worktree deleted';
                },
              },
            );
          }}
          variant='danger'
        >
          Delete
        </Button>
      </Modal.Footer>
    </Modal.Dialog>
  );
}

export function DeleteWorktree({
  worktreeDirectory,
  worktreeName,
  workspaceDirectory,
}: {
  worktreeDirectory: string;
  worktreeName: string;
  workspaceDirectory: string;
}) {
  const openModal = useGlobalModalStore((state) => state.openModal);

  return (
    <Dropdown.Item
      className='gap-1'
      variant='danger'
      onPress={() => {
        openModal({
          children: (
            <DeleteWorktreeConfirmationModal
              worktreeDirectory={worktreeDirectory}
              worktreeName={worktreeName}
              workspaceDirectory={workspaceDirectory}
            />
          ),
        });
      }}
    >
      <Icon size={14} data={TrashBin} className='text-danger-soft-foreground' />
      <Label className='text-danger-soft-foreground! font-medium'>Delete</Label>
    </Dropdown.Item>
  );
}

export function CopyDirectoryPath({ directory }: { directory: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { copied, copy } = useCopyToClipboard({
    animatedRef: containerRef,
  });

  return (
    <Dropdown.Item onPress={() => copy(directory)} shouldCloseOnSelect={false}>
      <style dangerouslySetInnerHTML={{ __html: copyButtonCss }} />

      <div ref={containerRef} className='t-text-swap items-center gap-1.25'>
        <div className='shrink-0'>
          {copied ? (
            <Icon size={14} data={Check} />
          ) : (
            <Icon size={14} data={Copy} />
          )}
        </div>

        <Label className='min-w-0 flex-1'>
          {copied ? 'Copied' : 'Copy Path'}
        </Label>
      </div>
    </Dropdown.Item>
  );
}

export function EditWorkspace({
  workspace,
  directoryNotFound,
}: {
  workspace: AeroWorkspaceSummary;
  directoryNotFound: boolean;
}) {
  const openModal = useGlobalModalStore((state) => state.openModal);

  return (
    <Dropdown.Item
      onPress={() => {
        openModal({
          children: (
            <EditWorkspaceModal
              workspace={workspace}
              directoryNotFound={directoryNotFound}
            />
          ),
        });
      }}
    >
      <Icon size={14} data={Pencil} />
      <div className='relative'>
        {directoryNotFound && (
          <div className='bg-danger absolute top-0.5 -right-2 size-1 rounded-full' />
        )}
        <Label className='font-medium'>Edit</Label>
      </div>
    </Dropdown.Item>
  );
}
