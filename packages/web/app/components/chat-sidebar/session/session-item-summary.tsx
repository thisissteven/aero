import { CircleTree, EllipsisVertical } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';
import { useShallow } from 'zustand/react/shallow';

import { cn, Dropdown, Separator, Sidebar, Spinner } from '@aero/ui';

import {
  ArchiveSession,
  ArchiveSessionIconButton,
  CopySessionId,
  DeleteSession,
  ExportMarkdown,
  RenameSession,
} from '@/app/components/chat-sidebar/session/session-actions';
import { SessionTitleEditable } from '@/app/components/session-title-editable';
import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { formatCompactRelativeTime } from '@/app/lib';
import {
  useRecentsSessionRenameStore,
  useWorkspacesSessionRenameStore,
} from '@/app/stores/session-rename';
import { AeroSessionSummary } from '@/server/services/harness/types';
import { isWorktree } from '@/server/shared';

interface ChatSidebarSessionItemProps {
  idPrefix: string;
  session: AeroSessionSummary;
  from: 'recents' | 'navbar' | 'workspaces';
  isWorktreeItem?: boolean;
}

export function SessionItemSummary({
  session,
  isWorktreeItem,
  isCurrent,
  from,
}: {
  session: ChatSidebarSessionItemProps['session'];
  isWorktreeItem?: boolean;
  isCurrent?: boolean;
  from: 'recents' | 'navbar' | 'workspaces';
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const recentsState = useRecentsSessionRenameStore((state) => state.state);
  const workspacesState = useWorkspacesSessionRenameStore(
    (state) => state.state,
  );

  const isRunning = useChatStore(
    useShallow((state) => state.runningSessions.includes(session.id)),
  );

  const isRenaming =
    (from === 'recents' &&
      recentsState.isRenaming &&
      recentsState.sessionId === session.id) ||
    (from === 'workspaces' &&
      workspacesState.isRenaming &&
      workspacesState.sessionId === session.id);

  if (!isRenaming) {
    return (
      <>
        <Sidebar.MenuItemContent>
          <Sidebar.MenuLabel
            className={cn(
              isWorktreeItem && 'text-foreground/50',
              isCurrent && 'text-foreground',
            )}
          >
            {session.title}
          </Sidebar.MenuLabel>
        </Sidebar.MenuItemContent>

        {isWorktree(session.workspace) ? (
          <Sidebar.MenuChip
            className={cn('hide-on-hover', dropdownOpen && 'hidden')}
          >
            <span className='text-muted'>
              <Icon data={CircleTree} size={12} />
            </span>
          </Sidebar.MenuChip>
        ) : null}

        <Sidebar.MenuChip
          className={cn('hide-on-hover', dropdownOpen && 'hidden')}
        >
          {isRunning ? (
            <Spinner size='sm' />
          ) : (
            <span className='text-muted text-[10px] leading-none'>
              {formatCompactRelativeTime(session.updatedAt)}
            </span>
          )}
        </Sidebar.MenuChip>

        <Sidebar.MenuActions className='ml-auto'>
          <ArchiveSessionIconButton
            sessionId={session.id}
            sessionTitle={session.title}
          />
          <Dropdown
            size='sm'
            isOpen={dropdownOpen}
            onOpenChange={setDropdownOpen}
          >
            <Dropdown.Trigger
              aria-label={`More actions for ${session.title}`}
              className='sidebar__menu-action group'
              data-slot='sidebar-menu-action'
            >
              <Icon
                data={EllipsisVertical}
                className='opacity-50 transition-opacity group-hover:opacity-80'
                style={{
                  width: 12,
                  height: 12,
                }}
              />
            </Dropdown.Trigger>
            <Dropdown.Popover
              className='w-44'
              crossOffset={6}
              placement='bottom end'
            >
              <Dropdown.Menu aria-label={`${session.title} actions`}>
                <RenameSession sessionId={session.id} from={from} />
                <CopySessionId sessionId={session.id} />
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
        </Sidebar.MenuActions>
      </>
    );
  }

  return (
    <div className='relative h-5 w-full sm:h-6'>
      {isRenaming && (
        <SessionTitleEditable
          key={session.id}
          from={from}
          sessionId={session.id}
          sessionTitle={session.title}
          className='text-sm font-medium'
          buttonClassName='dark:bg-surface-secondary'
          iconSize={12}
        />
      )}

      <div
        aria-hidden
        className={cn(
          'text-foreground gap-2 truncate text-sm sm:text-base',
          isRenaming && 'opacity-0',
        )}
      >
        {session.title}
      </div>
    </div>
  );
}
