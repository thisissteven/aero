import { CircleTree, EllipsisVertical } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { memo, useRef, useState, useTransition } from 'react';

import { cn, Dropdown, Separator, Sidebar } from '@aero/ui';

import {
  ArchiveSession,
  ArchiveSessionIconButton,
  CopySessionId,
  DeleteSession,
  ExportMarkdown,
  RenameSession,
  SelectSession,
} from '@/app/components/chat-sidebar/session-actions';
import { useSidebarStore } from '@/app/components/chat-sidebar/sidebar-store';
import { SessionTitleEditable } from '@/app/components/session-title-editable';
import { formatCompactRelativeTime } from '@/app/lib';
import { useSessionRenameStore } from '@/app/stores/session-rename';
import { AeroSessionSummary } from '@/server/services/harness/types';
import { isWorktree } from '@/server/shared';

interface ChatSidebarSessionItemProps {
  idPrefix: string;
  pathname: string;
  session: AeroSessionSummary;
}

export function SessionItemSummary({
  session,
}: {
  session: ChatSidebarSessionItemProps['session'];
}) {
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const state = useSessionRenameStore((state) => state.state);

  const isRenaming =
    state.isRenaming &&
    state.sessionId === session.id &&
    state.from === 'sidebar';

  if (!isRenaming) {
    return (
      <>
        <Sidebar.MenuItemContent>
          <Sidebar.MenuLabel>{session.title}</Sidebar.MenuLabel>
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

        {session.updatedAt ? (
          <Sidebar.MenuChip
            className={cn('hide-on-hover', dropdownOpen && 'hidden')}
          >
            <span className='text-muted text-[10px] leading-none'>
              {formatCompactRelativeTime(session.updatedAt)}
            </span>
          </Sidebar.MenuChip>
        ) : null}

        <Sidebar.MenuActions className='ml-auto'>
          <ArchiveSessionIconButton
            sessionId={session.id}
            sessionTitle={session.title}
          />
          <Dropdown isOpen={dropdownOpen} onOpenChange={setDropdownOpen}>
            <Dropdown.Trigger
              aria-label={`More actions for ${session.title}`}
              className='sidebar__menu-action group'
              data-slot='sidebar-menu-action'
            >
              <Icon
                data={EllipsisVertical}
                className='opacity-50 transition-opacity group-hover:opacity-100'
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
                <RenameSession sessionId={session.id} from='sidebar' />
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
        </Sidebar.MenuActions>
      </>
    );
  }

  return (
    <div className='relative h-5 w-full sm:h-6'>
      {isRenaming && (
        <SessionTitleEditable
          key={session.id}
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

export const ChatSidebarSessionItem = memo(
  function ChatSidebarSessionItem({
    idPrefix,
    pathname,
    session,
    ...props
  }: ChatSidebarSessionItemProps) {
    const navigate = useNavigate();
    const [, startTransition] = useTransition();

    const fullHref = `/sessions/${session.id}`;
    const isCurrent =
      pathname === fullHref ||
      pathname === session.id ||
      pathname === `/${session.id}`;

    const rename = useSessionRenameStore((state) => state.rename);
    const lastPressTimeRef = useRef<number>(0);

    const handlePress = () => {
      const now = Date.now();
      const DOUBLE_PRESS_THRESHOLD = 300; // ms window for double click

      if (now - lastPressTimeRef.current < DOUBLE_PRESS_THRESHOLD) {
        // DOUBLE PRESS DETECTED
        lastPressTimeRef.current = 0; // Reset timer
        rename(session.id, 'sidebar');
      } else {
        // SINGLE PRESS
        lastPressTimeRef.current = now;

        if (!isCurrent) {
          startTransition(() => {
            navigate({ to: fullHref });
          });
        }
      }
    };

    const isEditMode = useSidebarStore((state) => state.isEditMode);

    return (
      <Sidebar.MenuItem
        {...props}
        id={`${idPrefix}${session.id}`}
        isCurrent={isCurrent}
        textValue={session.title}
        onPress={handlePress}
      >
        {isEditMode && <SelectSession sessionId={session.id} />}
        <SessionItemSummary session={session} />
      </Sidebar.MenuItem>
    );
  },
  (prev, next) => {
    const prevIsCurrent =
      prev.pathname === `/sessions/${prev.session.id}` ||
      prev.pathname === prev.session.id ||
      prev.pathname === `/${prev.session.id}`;

    const nextIsCurrent =
      next.pathname === `/sessions/${next.session.id}` ||
      next.pathname === next.session.id ||
      next.pathname === `/${next.session.id}`;

    return (
      prev.session.id === next.session.id &&
      prev.session.title === next.session.title &&
      prevIsCurrent === nextIsCurrent
    );
  },
);
