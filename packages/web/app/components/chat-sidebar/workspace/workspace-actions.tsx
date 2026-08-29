import { Archive, TrashBin } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
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
import { useGlobalModalStore, useTheme } from '@/app/providers';

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
}: {
  worktreeDirectory: string;
  worktreeName: string;
}) {
  const { mutateAsync } = useDeleteWorktree();

  const navigate = useNavigate();

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
            toast.promise(mutateAsync({ directory: worktreeDirectory }), {
              loading: 'Deleting worktree...',
              error: (err) => err.message,
              success: (_data) => {
                navigate({
                  to: '/new',
                });
                return 'Worktree deleted';
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

export function DeleteWorktree({
  worktreeDirectory,
  worktreeName,
}: {
  worktreeDirectory: string;
  worktreeName: string;
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
