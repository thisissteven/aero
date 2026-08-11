import { Check, Ellipsis, Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useQueryClient } from '@tanstack/react-query';
import { useParams } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import {
  AppLayout,
  cn,
  Dropdown,
  Navbar,
  Separator,
  Sidebar,
  toast,
} from '@aero/ui';

import {
  ArchiveSession,
  CopySessionId,
  DeleteSession,
  ExportMarkdown,
  RenameSession,
} from '@/app/components/chat-sidebar/session-actions';
import {
  sessionKeys,
  useRenameSession,
  useSession,
} from '@/app/hooks/api/sessions';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useOnClickOutside } from '@/app/hooks/useOnClickOutside';
import { formatCompactRelativeTime } from '@/app/lib';
import { useSessionRenameStore } from '@/app/stores/session-rename';

import type { ChatActivePage } from '../data/chat';

export interface ChatNavbarProps {
  activePage: ChatActivePage;
}

export function ChatNavbar({ activePage }: ChatNavbarProps) {
  const isNew = activePage.kind === 'new';
  const isSessions = activePage.kind === 'sessions';

  return (
    <Navbar maxWidth='full'>
      <Navbar.Header>
        <AppLayout.MenuToggle />
        <Sidebar.Trigger />
        {isNew && <NewNavbarContent />}
        {isSessions && <SessionsNavbarContent />}
        <Navbar.Spacer />
      </Navbar.Header>
    </Navbar>
  );
}

function NewNavbarContent() {
  return (
    <div className='flex min-w-0 flex-col'>
      <h1 className='text-foreground truncate text-sm font-semibold sm:text-base'>
        New Chat
      </h1>
      <span className='text-muted truncate text-xs'>
        Start a brand new conversation
      </span>
    </div>
  );
}

export function SessionTitleEditable({
  sessionId,
  sessionTitle,
  className = 'sm:text-base text-sm font-semibold',
  buttonClassName,
  iconSize = 14,
}: {
  sessionId: string;
  sessionTitle: string;
  className?: string;
  buttonClassName?: string;
  iconSize?: number;
}) {
  const { mutateAsync, isPending } = useRenameSession();
  const { cancelRename } = useSessionRenameStore();
  const queryClient = useQueryClient();

  const [value, setValue] = useState(sessionTitle);

  const ref = useRef<HTMLInputElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  useOnClickOutside(formRef, cancelRename);
  useKeyPress('Escape', cancelRename, { ignoreInputs: false });

  useEffect(() => {
    const frameId = requestAnimationFrame(() => {
      if (ref.current) {
        ref.current.focus();
        const length = ref.current.value.length;
        ref.current.setSelectionRange(length, length);
      }
    });

    return () => cancelAnimationFrame(frameId);
  }, []);

  return (
    <form
      ref={formRef}
      className='absolute inset-0'
      onSubmit={(e) => {
        e.preventDefault();

        const title = value.trim();

        if (title === sessionTitle) {
          cancelRename();
          return;
        }

        const processRename = async () => {
          await mutateAsync({ sessionId, title });

          await Promise.all([
            queryClient.invalidateQueries({
              queryKey: sessionKeys.all(undefined),
            }),
            queryClient.invalidateQueries({
              queryKey: sessionKeys.detail(undefined, sessionId),
            }),
          ]);

          cancelRename();
        };

        toast.promise(processRename(), {
          loading: 'Renaming session...',
          error: (err) => err.message,
          success: 'Session renamed',
        });
      }}
    >
      <div
        onMouseDown={(e) => e.stopPropagation()}
        className='flex h-full w-full items-center gap-2'
      >
        <input
          ref={ref}
          placeholder='Enter session title'
          value={value}
          onKeyDown={(e) => {
            if (e.key === 'Escape') {
              return;
            }

            e.stopPropagation();
          }}
          onChange={(e) => setValue(e.target.value)}
          className={cn(
            'text-foreground relative z-1 min-w-0 flex-1 focus-visible:outline-none',
            className,
          )}
        />

        <div
          className={cn(
            'relative z-1 flex shrink-0 items-center',
            iconSize <= 16 && 'gap-0.75',
            iconSize <= 12 && 'gap-0.5',
          )}
        >
          <button
            disabled={isPending}
            onClick={(e) => e.stopPropagation()}
            type='submit'
            className={cn(
              'bg-surface-secondary dark:bg-surface hover:bg-surface-hover cursor-pointer rounded-md p-1 backdrop-blur-sm transition active:scale-95 disabled:pointer-events-none disabled:opacity-50',
              buttonClassName,
            )}
          >
            <Icon data={Check} size={iconSize} />
          </button>
          <button
            disabled={isPending}
            type='button'
            className={cn(
              'bg-surface-secondary dark:bg-surface hover:bg-surface-hover cursor-pointer rounded-md p-1 backdrop-blur-sm transition active:scale-95 disabled:pointer-events-none disabled:opacity-50',
              buttonClassName,
            )}
            onClick={(e) => {
              e.stopPropagation();
              cancelRename();
            }}
          >
            <Icon data={Xmark} size={iconSize} />
          </button>
        </div>
      </div>
    </form>
  );
}

function SessionTitle({
  sessionId,
  sessionTitle,
}: {
  sessionId: string;
  sessionTitle: string;
}) {
  const { state } = useSessionRenameStore();

  const isRenaming =
    state.isRenaming &&
    state.sessionId === sessionId &&
    state.from === 'navbar';

  return (
    <div className='relative h-5 max-w-sm max-sm:max-w-[200px] sm:h-6 sm:max-w-lg'>
      {isRenaming && (
        <SessionTitleEditable
          key={sessionId}
          sessionId={sessionId}
          sessionTitle={sessionTitle}
        />
      )}

      <h1
        aria-hidden={isRenaming}
        className={cn(
          'text-foreground flex items-center gap-2 truncate text-sm font-semibold sm:text-base',
          isRenaming && 'min-w-[200px] opacity-0',
        )}
      >
        <span className='truncate'>{sessionTitle}</span>
        {isRenaming && (
          <span className='invisible flex shrink-0 items-center gap-1 p-1'>
            <span className='h-6 w-6' />
            <span className='h-6 w-6' />
          </span>
        )}
      </h1>
    </div>
  );
}

function SessionsNavbarContent() {
  const { sessionId } = useParams({
    strict: false,
  });
  const { data: session } = useSession(undefined, sessionId);

  if (!session) {
    return <NewNavbarContent />;
  }

  return (
    <div className='flex items-start'>
      <div className='flex min-w-0 flex-col'>
        <SessionTitle sessionId={session.id} sessionTitle={session.title} />
        <div className='flex items-center gap-1'>
          <span className='text-muted truncate text-xs'>
            {formatCompactRelativeTime(session.updatedAt)} ago at
          </span>
          <span className='text-muted truncate text-xs font-bold'>
            {session.workspace}
          </span>
        </div>
      </div>
      <div>
        <Dropdown>
          <Dropdown.Trigger
            aria-label={`More actions for ${session.title}`}
            className='mt-1.5 ml-2'
          >
            <Icon
              data={Ellipsis}
              className='opacity-50 transition-opacity hover:opacity-100'
              style={{
                width: 14,
                height: 14,
              }}
            />
          </Dropdown.Trigger>
          <Dropdown.Popover
            className='w-44 max-sm:min-w-44'
            crossOffset={12}
            placement='bottom end'
          >
            <Dropdown.Menu aria-label={`${session.title} actions`}>
              <RenameSession sessionId={session.id} from='navbar' />
              <CopySessionId sessionId={session.id} />
              <ExportMarkdown sessionId={session.id} />
              <Separator />
              <ArchiveSession
                sessionId={session.id}
                sessionTitle={session.title}
              />
              <DeleteSession
                sessionId={session.id}
                sessionTitle={session.title}
              />
            </Dropdown.Menu>
          </Dropdown.Popover>
        </Dropdown>
      </div>
    </div>
  );
}
