import { CircleTree, Ellipsis } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useParams } from '@tanstack/react-router';

import {
  AppLayout,
  cn,
  Dropdown,
  Navbar,
  Separator,
  Sidebar,
  Skeleton,
} from '@aero/ui';

import { ContextUsagePreview } from '@/app/components/chat-navbar/context-usage-preview';
import { OpenInActions } from '@/app/components/chat-navbar/open-in-actions/open-in-actions';
import {
  ArchiveSession,
  CopySessionId,
  DeleteSession,
  ExportMarkdown,
  RenameSession,
  ShareUnshareSession,
} from '@/app/components/chat-sidebar/session/session-actions';
import { SessionTitleEditable } from '@/app/components/session-title-editable';
import { useSession } from '@/app/hooks/api/sessions';
import { formatCompactRelativeTime } from '@/app/lib';
import { getLastPathName } from '@/app/lib/file';
import { useNavbarSessionRenameStore } from '@/app/stores/session-rename';
import { isWorktree } from '@/server/shared';

import type { ChatActivePage } from '../../data/chat';

export interface ChatNavbarProps {
  activePage: ChatActivePage;
  isAsideExpanded: boolean;
}

export function ChatNavbar({ activePage, isAsideExpanded }: ChatNavbarProps) {
  const isNew = activePage.kind === 'new';
  const isSessions = activePage.kind === 'sessions';

  return (
    <Navbar maxWidth='full' className='relative h-14'>
      {isAsideExpanded && (
        <div className='border-separator absolute bottom-0 left-0 h-0 w-full border-b max-sm:hidden'></div>
      )}
      <Navbar.Header className='overflow-hidden pr-0'>
        <AppLayout.MenuToggle className='shrink-0' />
        <Sidebar.Trigger className='shrink-0' />
        {isNew && <NewNavbarContent />}
        {isSessions && <SessionsNavbarContent />}
        <Navbar.Spacer />
        <div className='flex items-center gap-2 max-md:hidden'>
          <ContextUsagePreview />
          <OpenInActions />
        </div>
      </Navbar.Header>
    </Navbar>
  );
}

function NavbarContentSkeleton() {
  return (
    <div className='flex min-w-0 flex-col gap-1'>
      <Skeleton className='h-3 w-48' />
      <Skeleton className='h-3 w-32' />
    </div>
  );
}

function NavbarContentPlaceholder({ h1, span }: { h1: string; span: string }) {
  return (
    <div className='flex min-w-0 flex-col'>
      <h1 className='text-foreground truncate text-sm font-semibold sm:text-base'>
        {h1}
      </h1>
      <span className='text-muted truncate text-xs'>{span}</span>
    </div>
  );
}

function NewNavbarContent() {
  return (
    <NavbarContentPlaceholder
      h1='New Session'
      span='Start a brand new conversation'
    />
  );
}

function SessionTitle({
  sessionId,
  sessionTitle,
}: {
  sessionId: string;
  sessionTitle: string;
}) {
  const state = useNavbarSessionRenameStore((state) => state.state);

  const isRenaming = state.isRenaming && state.sessionId === sessionId;

  return (
    <div className='relative h-5 max-w-sm max-sm:max-w-[200px] sm:h-6 sm:max-w-lg'>
      {isRenaming && (
        <SessionTitleEditable
          key={sessionId}
          from='navbar'
          sessionId={sessionId}
          sessionTitle={sessionTitle}
        />
      )}

      <h1
        aria-hidden={isRenaming}
        className={cn(
          'text-foreground flex min-w-0 items-center gap-2 text-sm font-semibold sm:text-base',
          isRenaming && 'min-w-[200px] opacity-0',
        )}
      >
        <span className='min-w-0 truncate'>{sessionTitle}</span>
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

  const { data: session, isPending } = useSession(undefined, sessionId);

  if (isPending) {
    return <NavbarContentSkeleton />;
  }

  if (!session) {
    return (
      <NavbarContentPlaceholder
        h1='Session not found'
        span='Head to new session page to create a new session'
      />
    );
  }

  const isStandaloneSession = session.workspace.includes('.aero/workspaces');

  return (
    <div className='flex min-w-0 items-start gap-2 transition'>
      <div className='flex min-w-0 flex-col'>
        <SessionTitle sessionId={session.id} sessionTitle={session.title} />

        <div className='text-muted flex min-w-0 items-center gap-1 overflow-hidden text-xs'>
          <span className='shrink-0'>
            {formatCompactRelativeTime(session.updatedAt, true)}
            {!isStandaloneSession && ` at `}
          </span>
          {isStandaloneSession && (
            <span>
              (Standalone session) {session.readOnly && ' (read only)'}
            </span>
          )}
          {!isStandaloneSession && !isWorktree(session.workspace) && (
            <span className='truncate font-bold'>
              {getLastPathName(session.workspace)}
              {session.readOnly && ' (read only)'}
            </span>
          )}
          {!isStandaloneSession && isWorktree(session.workspace) && (
            <div className='flex items-center gap-1'>
              <Icon data={CircleTree} size={12} />
              <span className='truncate font-bold'>
                {getLastPathName(session.workspace)}
                {session.readOnly && ' (read only)'}
              </span>
            </div>
          )}
        </div>
      </div>
      <div>
        <Dropdown size='sm'>
          <Dropdown.Trigger
            aria-label={`More actions for ${session.title}`}
            className='mt-1.5 ml-2'
          >
            <Icon
              data={Ellipsis}
              className='opacity-50 transition-opacity hover:opacity-80'
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
              <Separator className='my-0.5' />
              <ShareUnshareSession
                sessionId={session.id}
                sharedUrl={session.sharedUrl}
              />
              <ExportMarkdown sessionId={session.id} />
              <Separator className='my-0.5' />
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
