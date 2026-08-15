import { Archive, TrashBin } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useRef } from 'react';

import { Button, Checkbox } from '@aero/ui';

import {
  ArchiveBulkSessionsConfirmationModal,
  DeleteBulkSessionsConfirmationModal,
} from '@/app/components/chat-sidebar/session-actions';
import { useWorkspacesSidebarStore } from '@/app/components/chat-sidebar/sidebar-store';
import {
  dedupeById,
  dedupeWorktreesByDirectory,
} from '@/app/components/chat-sidebar/workspace-item';
import { CollapsibleActions } from '@/app/components/collapsible-actions';
import {
  workspaceKeys,
  WorkspacesPageResponse,
} from '@/app/hooks/api/workspaces';
import { useGlobalModalStore, useTheme } from '@/app/providers';

export function WorkspacesToggleEditModeButton() {
  const isEditMode = useWorkspacesSidebarStore((state) => state.isEditMode);
  const toggleIsEditMode = useWorkspacesSidebarStore(
    (state) => state.toggleisEditMode,
  );
  const openModal = useGlobalModalStore((state) => state.openModal);

  const { theme } = useTheme();

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
          variant={theme === 'dark' ? 'secondary' : 'primary'}
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
          variant='tertiary'
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
    const queries = queryClient.getQueriesData<
      InfiniteData<WorkspacesPageResponse>
    >({
      queryKey: [...workspaceKeys.merged(), undefined],
      exact: true,
    });

    const activeQuery = queries[queries.length - 1];
    const data = activeQuery?.[1];

    if (!data?.pages) return [];

    return data.pages.flatMap((page) =>
      page.items.flatMap((workspace) => {
        // 1. Deduplicate worktrees and sessions
        const cleanWorktrees = dedupeWorktreesByDirectory(
          workspace.worktrees,
        ).map((worktree) => ({
          ...worktree,
          sessions: dedupeById(worktree.sessions),
        }));

        // 2. Separate root from other worktrees
        const rootWorktree = cleanWorktrees.find(
          (worktree) => worktree.directory === workspace.directory,
        );

        const otherWorktrees = rootWorktree
          ? cleanWorktrees.filter(
              (worktree) => worktree.directory !== rootWorktree.directory,
            )
          : cleanWorktrees;

        // 3. Reorder: root comes first, followed by remaining worktrees
        const orderedWorktrees = [
          ...(rootWorktree ? [rootWorktree] : []),
          ...otherWorktrees,
        ];

        // 4. Map to session IDs
        return orderedWorktrees.flatMap((worktree) =>
          worktree.sessions.map((session) => session.id),
        );
      }),
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

  const { theme } = useTheme();

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
        variant={theme === 'dark' ? 'secondary' : 'primary'}
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
