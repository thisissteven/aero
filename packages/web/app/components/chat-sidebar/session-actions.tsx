import {
  Archive,
  ArrowUpFromSquare,
  ArrowUpFromSquareSlash,
  Check,
  Copy,
  LogoMarkdown,
  Pencil,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon, Label } from '@gravity-ui/uikit';
import { InfiniteData, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useRef } from 'react';

import { Button, Checkbox, Dropdown, Modal, Sidebar, toast } from '@aero/ui';

import { useRecentsSidebarStore } from '@/app/components/chat-sidebar/sidebar-store';
import { CollapsibleActions } from '@/app/components/collapsible-actions';
import {
  sessionKeys,
  SessionsPageResponse,
  useArchiveBulkSessions,
  useArchiveSession,
  useDeleteBulkSessions,
  useDeleteSession,
  useSessionMarkdown,
  useShareSession,
  useUnshareSession,
} from '@/app/hooks/api/sessions';
import { useCopyToClipboard } from '@/app/hooks/useCopyToClipboard';
import { handleDownloadMarkdown } from '@/app/lib';
import { copyButtonCss } from '@/app/lib/file';
import { useTheme } from '@/app/providers';
import { useGlobalModalStore } from '@/app/providers/GlobalModal';
import {
  useNavbarSessionRenameStore,
  useRecentsSessionRenameStore,
  useWorkspacesSessionRenameStore,
} from '@/app/stores/session-rename';

export function RecentsToggleEditModeButton() {
  const isEditMode = useRecentsSidebarStore((state) => state.isEditMode);
  const toggleIsEditMode = useRecentsSidebarStore(
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
          name='edit-mode-recents'
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
              useRecentsSidebarStore.getState().selectedSessionIds;
            openModal({
              children: (
                <DeleteBulkSessionsConfirmationModal sessionIds={sessionIds} />
              ),
            });
          }}
          isIconOnly
        >
          <Icon size={14} data={TrashBin} />
        </Button>
        <Button
          variant='tertiary'
          onPress={() => {
            const sessionIds =
              useRecentsSidebarStore.getState().selectedSessionIds;
            openModal({
              children: (
                <ArchiveBulkSessionsConfirmationModal sessionIds={sessionIds} />
              ),
            });
          }}
          isIconOnly
        >
          <Icon size={14} data={Archive} />
        </Button>
      </CollapsibleActions.Contents>
    </CollapsibleActions>
  );
}

export function SelectSession({ sessionId }: { sessionId: string }) {
  const queryClient = useQueryClient();
  const isShiftPressedRef = useRef(false);

  const isSelected = useRecentsSidebarStore((state) =>
    state.selectedSessionIds.includes(sessionId),
  );
  const toggleSessionSelection = useRecentsSidebarStore(
    (state) => state.toggleSessionSelection,
  );

  // Capture shiftKey in CAPTURE phase before React Aria handles the event
  const handlePointerDownCapture = (e: React.PointerEvent) => {
    isShiftPressedRef.current = e.shiftKey;
    if (e.shiftKey) {
      // Prevent browser text-selection highlighting on Shift + Click
      e.preventDefault();
    }
  };

  // Safely extract ordered IDs from TanStack Query infinite data cache
  const getOrderedSessionIds = (): string[] => {
    // Finds queries matching ['sessions', 'default'] prefix
    const queries = queryClient.getQueriesData<
      InfiniteData<SessionsPageResponse>
    >({
      queryKey: [...sessionKeys.merged(), undefined],
      exact: true,
    });

    // Get the most recently updated query matching this key
    const activeQuery = queries[queries.length - 1];
    const data = activeQuery?.[1];

    if (!data?.pages) return [];

    // Directly map the pages to IDs
    return data.pages.flatMap((page) => page.items.map((item) => item.id));
  };

  const handleSelectionChange = () => {
    const isShiftPressed = isShiftPressedRef.current;
    isShiftPressedRef.current = false; // Reset ref state

    let orderedIds: string[] = [];
    if (isShiftPressed) {
      orderedIds = getOrderedSessionIds();
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

export function RenameSession({
  sessionId,
  from,
}: {
  sessionId: string;
  from: 'recents' | 'navbar' | 'workspaces';
}) {
  const renameRecents = useRecentsSessionRenameStore((state) => state.rename);
  const renameNavbar = useNavbarSessionRenameStore((state) => state.rename);
  const renameWorkspaces = useWorkspacesSessionRenameStore(
    (state) => state.rename,
  );

  return (
    <Dropdown.Item
      className='gap-1'
      onPress={() => {
        switch (from) {
          case 'navbar':
            renameNavbar(sessionId);
            break;
          case 'recents':
            renameRecents(sessionId);
            break;
          case 'workspaces':
            renameWorkspaces(sessionId);
            break;
        }
      }}
    >
      <Icon size={14} data={Pencil} />
      <Label>Rename</Label>
    </Dropdown.Item>
  );
}

export function CopySessionId({ sessionId }: { sessionId: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { copied, copy } = useCopyToClipboard({
    animatedRef: containerRef,
  });

  return (
    <Dropdown.Item onPress={() => copy(sessionId)} shouldCloseOnSelect={false}>
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
          {copied ? 'Copied' : 'Copy Session ID'}
        </Label>
      </div>
    </Dropdown.Item>
  );
}

export function CopySessionUrl({ sharedUrl }: { sharedUrl: string }) {
  const containerRef = useRef<HTMLDivElement | null>(null);

  const { copied, copy } = useCopyToClipboard({
    animatedRef: containerRef,
  });

  return (
    <Dropdown.Item onPress={() => copy(sharedUrl)} shouldCloseOnSelect={false}>
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
          {copied ? 'Copied' : 'Copy Shared Link'}
        </Label>
      </div>
    </Dropdown.Item>
  );
}

export function UnshareSession({ sessionId }: { sessionId: string }) {
  const { mutateAsync } = useUnshareSession();

  return (
    <Dropdown.Item
      className='gap-1'
      onPress={() => {
        toast.promise(mutateAsync(sessionId), {
          loading: 'Unsharing session...',
          error: (err) => err.message,
          success: 'Session unshared',
        });
      }}
    >
      <Icon size={14} data={ArrowUpFromSquareSlash} className='shrink-0' />
      <Label>Unshare session</Label>
    </Dropdown.Item>
  );
}

export function ShareSession({ sessionId }: { sessionId: string }) {
  const { mutateAsync } = useShareSession();

  return (
    <Dropdown.Item
      className='gap-1'
      onPress={() => {
        toast.promise(mutateAsync(sessionId), {
          loading: 'Retrieving session link...',
          error: (err) => err.message,
          success: async (data) => {
            if (data.sharedUrl) {
              try {
                await navigator.clipboard.writeText(data.sharedUrl);
                return 'Session link copied to clipboard';
              } catch {
                return 'Clipboard not supported';
              }
            }
          },
        });
      }}
    >
      <Icon size={14} data={ArrowUpFromSquare} className='shrink-0' />
      <Label>Share session</Label>
    </Dropdown.Item>
  );
}

export function ShareUnshareSession({
  sessionId,
  sharedUrl,
}: {
  sessionId: string;
  sharedUrl?: string;
}) {
  if (sharedUrl) {
    return (
      <>
        <CopySessionUrl sharedUrl={sharedUrl} />
        <UnshareSession sessionId={sessionId} />
      </>
    );
  }

  return <ShareSession sessionId={sessionId} />;
}

export function ExportMarkdown({ sessionId }: { sessionId: string }) {
  const { mutateAsync } = useSessionMarkdown();

  return (
    <Dropdown.Item
      className='gap-1'
      onPress={() => {
        toast.promise(mutateAsync(sessionId), {
          loading: 'Retrieving markdown...',
          error: (err) => err.message,
          success: (data) => {
            handleDownloadMarkdown(data.markdown, data.title);
            return 'Markdown retrieved';
          },
        });
      }}
    >
      <Icon size={14} data={LogoMarkdown} className='shrink-0' />
      <Label>Export Markdown</Label>
    </Dropdown.Item>
  );
}

function ArchiveBulkSessionsConfirmationModal({
  sessionIds,
}: {
  sessionIds: string[];
}) {
  const { mutateAsync } = useArchiveBulkSessions();

  const navigate = useNavigate();

  return (
    <Modal.Dialog className='sm:max-w-[360px]'>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>Archive sessions?</Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        <p>
          A total of {sessionIds.length} session
          {sessionIds.length > 1 ? 's' : ''} will be archived.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button slot='close' variant='tertiary'>
          Cancel
        </Button>
        <Button
          slot='close'
          onPress={() => {
            toast.promise(mutateAsync(sessionIds), {
              loading: 'Archiving sessions...',
              error: (err) => err.message,
              success: (_data) => {
                navigate({
                  to: '/new',
                });
                return 'Sessions archived';
              },
            });
          }}
          variant='danger'
        >
          Archive
        </Button>
      </Modal.Footer>
    </Modal.Dialog>
  );
}

function ArchiveSessionConfirmationModal({
  sessionId,
  sessionTitle,
}: {
  sessionId: string;
  sessionTitle: string;
}) {
  const { mutateAsync } = useArchiveSession();

  const navigate = useNavigate();

  return (
    <Modal.Dialog className='sm:max-w-[360px]'>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>Archive session?</Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        <p>"{sessionTitle}" will be archived.</p>
      </Modal.Body>
      <Modal.Footer>
        <Button slot='close' variant='tertiary'>
          Cancel
        </Button>
        <Button
          slot='close'
          onPress={() => {
            toast.promise(mutateAsync(sessionId), {
              loading: 'Archiving session...',
              error: (err) => err.message,
              success: (_data) => {
                navigate({
                  to: '/new',
                });
                return 'Session archived';
              },
            });
          }}
          variant='danger'
        >
          Archive
        </Button>
      </Modal.Footer>
    </Modal.Dialog>
  );
}

export function ArchiveSessionIconButton({
  sessionId,
  sessionTitle,
}: {
  sessionId: string;
  sessionTitle: string;
}) {
  const openModal = useGlobalModalStore((state) => state.openModal);

  return (
    <Sidebar.MenuAction
      aria-label={`Archive ${sessionTitle}`}
      className='group'
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        openModal({
          children: (
            <ArchiveSessionConfirmationModal
              sessionId={sessionId}
              sessionTitle={sessionTitle}
            />
          ),
        });
      }}
    >
      <Icon
        data={Archive}
        className='opacity-50 transition-opacity group-hover:opacity-100'
        style={{
          width: 12,
          height: 12,
        }}
      />
    </Sidebar.MenuAction>
  );
}

export function ArchiveSession({
  sessionId,
  sessionTitle,
}: {
  sessionId: string;
  sessionTitle: string;
}) {
  const openModal = useGlobalModalStore((state) => state.openModal);

  return (
    <Dropdown.Item
      className='gap-1'
      onPress={() => {
        openModal({
          children: (
            <ArchiveSessionConfirmationModal
              sessionId={sessionId}
              sessionTitle={sessionTitle}
            />
          ),
        });
      }}
    >
      <Icon size={14} data={Archive} />
      <Label>Archive</Label>
    </Dropdown.Item>
  );
}

function DeleteBulkSessionsConfirmationModal({
  sessionIds,
}: {
  sessionIds: string[];
}) {
  const { mutateAsync } = useDeleteBulkSessions();

  const navigate = useNavigate();

  return (
    <Modal.Dialog className='sm:max-w-[360px]'>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>Delete sessions?</Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        <p>
          A total of {sessionIds.length} session
          {sessionIds.length > 1 ? 's' : ''} will be deleted.
        </p>
      </Modal.Body>
      <Modal.Footer>
        <Button slot='close' variant='tertiary'>
          Cancel
        </Button>
        <Button
          slot='close'
          onPress={() => {
            toast.promise(mutateAsync(sessionIds), {
              loading: 'Deleting sessions...',
              error: (err) => err.message,
              success: (_data) => {
                navigate({
                  to: '/new',
                });
                return 'Sessions deleted';
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

function DeleteSessionConfirmationModal({
  sessionId,
  sessionTitle,
}: {
  sessionId: string;
  sessionTitle: string;
}) {
  const { mutateAsync } = useDeleteSession();

  const navigate = useNavigate();

  return (
    <Modal.Dialog className='sm:max-w-[360px]'>
      <Modal.CloseTrigger />
      <Modal.Header>
        <Modal.Heading>Delete session?</Modal.Heading>
      </Modal.Header>
      <Modal.Body>
        <p>"{sessionTitle}" will be permanently deleted.</p>
      </Modal.Body>
      <Modal.Footer>
        <Button slot='close' variant='tertiary'>
          Cancel
        </Button>
        <Button
          slot='close'
          onPress={() => {
            toast.promise(mutateAsync(sessionId), {
              loading: 'Deleting session...',
              error: (err) => err.message,
              success: (_data) => {
                navigate({
                  to: '/new',
                });
                return 'Session deleted';
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

export function DeleteSession({
  sessionId,
  sessionTitle,
}: {
  sessionId: string;
  sessionTitle: string;
}) {
  const openModal = useGlobalModalStore((state) => state.openModal);

  return (
    <Dropdown.Item
      className='gap-1'
      variant='danger'
      onPress={() => {
        openModal({
          children: (
            <DeleteSessionConfirmationModal
              sessionId={sessionId}
              sessionTitle={sessionTitle}
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
