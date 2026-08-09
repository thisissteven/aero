import { Archive, EllipsisVertical, Pencil } from '@gravity-ui/icons';
import { Icon, Label } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { memo, useState, useTransition } from 'react';

import { cn, Dropdown, Separator, Sidebar } from '@aero/ui';

import {
  ArchiveSession,
  CopySessionId,
  DeleteSession,
  ExportMarkdown,
} from '@/app/components/chat-sidebar/session-actions';
import { ChatSession } from '@/app/data/chat';
import { formatCompactRelativeTime } from '@/app/lib';
import { AeroSessionSummary } from '@/server/services/harness/types';

interface ChatSidebarSessionItemProps {
  basePath: string;
  disableNavigation: boolean;
  idPrefix: string;
  pathname: string;
  session: ChatSession | AeroSessionSummary;
}

export const ChatSidebarSessionItem = memo(
  function ChatSidebarSessionItem({
    basePath,
    disableNavigation,
    idPrefix,
    pathname,
    session,
  }: ChatSidebarSessionItemProps) {
    const navigate = useNavigate();
    const [, startTransition] = useTransition();

    const fullHref = `${basePath}/sessions/${session.id}`;
    const isCurrent =
      pathname === fullHref ||
      pathname === session.id ||
      pathname === `/${session.id}`;

    // 2. Non-blocking navigation transition on click
    const handlePress = () => {
      if (disableNavigation || isCurrent) return;
      startTransition(() => {
        navigate({ to: fullHref });
      });
    };

    const [dropdownOpen, setDropdownOpen] = useState(false);

    return (
      <Sidebar.MenuItem
        id={`${idPrefix}${session.id}`}
        isCurrent={isCurrent}
        textValue={session.title}
        onPress={handlePress}
      >
        <Sidebar.MenuItemContent>
          <Sidebar.MenuLabel>{session.title}</Sidebar.MenuLabel>
        </Sidebar.MenuItemContent>
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
          <Sidebar.MenuAction
            aria-label={`Archive ${session.title}`}
            className='group'
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
                <Dropdown.Item className='gap-2'>
                  <Icon data={Pencil} />
                  <Label>Rename</Label>
                </Dropdown.Item>
                <CopySessionId sessionId={session.id} />
                <ExportMarkdown sessionId={session.id} />
                <Separator />
                <ArchiveSession sessionId={session.id} />
                <DeleteSession sessionId={session.id} />
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Sidebar.MenuActions>
      </Sidebar.MenuItem>
    );
  },
  (prev, next) => {
    const prevIsCurrent =
      prev.pathname === `${prev.basePath}/sessions/${prev.session.id}` ||
      prev.pathname === prev.session.id ||
      prev.pathname === `/${prev.session.id}`;

    const nextIsCurrent =
      next.pathname === `${next.basePath}/sessions/${next.session.id}` ||
      next.pathname === next.session.id ||
      next.pathname === `/${next.session.id}`;

    return (
      prev.session.id === next.session.id &&
      prev.session.title === next.session.title &&
      prevIsCurrent === nextIsCurrent &&
      prev.disableNavigation === next.disableNavigation
    );
  },
);
