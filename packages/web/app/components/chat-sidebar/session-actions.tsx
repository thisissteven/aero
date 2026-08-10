import {
  Archive,
  Check,
  Copy,
  LogoMarkdown,
  Pencil,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon, Label } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { useRef } from 'react';

import { Button, Dropdown, Modal, Sidebar, toast } from '@aero/ui';

import {
  useArchiveSession,
  useDeleteSession,
  useSessionMarkdown,
} from '@/app/hooks/api/sessions';
import { useCopyToClipboard } from '@/app/hooks/useCopyToClipboard';
import { handleDownloadMarkdown } from '@/app/lib';
import { useGlobalModalStore } from '@/app/providers/GlobalModal';
import {
  SessionRenameFromEnum,
  useSessionRenameStore,
} from '@/app/stores/session-rename';

export function RenameSession({
  sessionId,
  from,
}: {
  sessionId: string;
  from: SessionRenameFromEnum;
}) {
  const { rename } = useSessionRenameStore();

  return (
    <Dropdown.Item className='gap-2' onPress={() => rename(sessionId, from)}>
      <Icon data={Pencil} />
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
      <style>{`
        .t-text-swap {
          --text-swap-dur: 150ms;
          --text-swap-translate-y: 4px;
          --text-swap-blur: 2px;
          --text-swap-ease: ease-in-out;

          display: flex;
          transform: translateY(0);
          filter: blur(0);
          opacity: 1;
          transition:
            transform var(--text-swap-dur) var(--text-swap-ease),
            filter var(--text-swap-dur) var(--text-swap-ease),
            opacity var(--text-swap-dur) var(--text-swap-ease);
          will-change: transform, filter, opacity;
        }

        .t-text-swap.is-exit {
          transform: translateY(calc(var(--text-swap-translate-y) * -1));
          filter: blur(var(--text-swap-blur));
          opacity: 0;
        }

        .t-text-swap.is-enter-start {
          transform: translateY(var(--text-swap-translate-y));
          filter: blur(var(--text-swap-blur));
          opacity: 0;
          transition: none;
        }

        @media (prefers-reduced-motion: reduce) {
          .t-text-swap {
            transition: none !important;
          }
        }
      `}</style>

      <div ref={containerRef} className='t-text-swap items-center gap-2'>
        <div className='shrink-0'>
          {copied ? <Icon data={Check} /> : <Icon data={Copy} />}
        </div>

        <Label className='min-w-0 flex-1'>
          {copied ? 'Copied' : 'Copy Session Id'}
        </Label>
      </div>
    </Dropdown.Item>
  );
}

export function ExportMarkdown({ sessionId }: { sessionId: string }) {
  const { mutateAsync } = useSessionMarkdown();

  return (
    <Dropdown.Item
      className='gap-2'
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
      <Icon data={LogoMarkdown} className='shrink-0' />
      <Label>Export Markdown</Label>
    </Dropdown.Item>
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
  const { openModal } = useGlobalModalStore();

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
  const { openModal } = useGlobalModalStore();

  return (
    <Dropdown.Item
      className='gap-2'
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
      <Icon data={Archive} />
      <Label>Archive</Label>
    </Dropdown.Item>
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
  const { openModal } = useGlobalModalStore();

  return (
    <Dropdown.Item
      className='gap-2'
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
      <Icon data={TrashBin} className='text-danger' />
      <Label className='text-danger! font-medium'>Delete</Label>
    </Dropdown.Item>
  );
}
