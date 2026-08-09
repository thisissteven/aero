import {
  Archive,
  Check,
  Copy,
  LogoMarkdown,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon, Label } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { useRef } from 'react';

import { Dropdown, toast } from '@aero/ui';

import {
  useArchiveSession,
  useDeleteSession,
  useSessionMarkdown,
} from '@/app/hooks/api/sessions';
import { useCopyToClipboard } from '@/app/hooks/useCopyToClipboard';
import { handleDownloadMarkdown } from '@/app/lib';

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

export function ArchiveSession({ sessionId }: { sessionId: string }) {
  const { mutateAsync } = useArchiveSession();

  const navigate = useNavigate();

  return (
    <Dropdown.Item
      className='gap-2'
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
    >
      <Icon data={Archive} />
      <Label>Archive</Label>
    </Dropdown.Item>
  );
}

export function DeleteSession({ sessionId }: { sessionId: string }) {
  const { mutateAsync } = useDeleteSession();

  const navigate = useNavigate();

  return (
    <Dropdown.Item
      className='gap-2'
      variant='danger'
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
    >
      <Icon data={TrashBin} className='text-danger' />
      <Label className='text-danger! font-semibold'>Delete</Label>
    </Dropdown.Item>
  );
}
