import {
  Archive,
  Copy,
  EllipsisVertical,
  LogoMarkdown,
  Pencil,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon, Label } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { memo, useState, useTransition } from 'react';

import { cn, Dropdown, Separator, Sidebar } from '@aero/ui';

import { ChatThread } from '@/app/data/chat';
import { formatCompactRelativeTime } from '@/app/lib';
import { AeroSessionSummary } from '@/server/services/harness/types';

interface ChatSidebarThreadItemProps {
  basePath: string;
  disableNavigation: boolean;
  idPrefix: string;
  pathname: string;
  thread: ChatThread | AeroSessionSummary;
}

export const ChatSidebarThreadItem = memo(
  function ChatSidebarThreadItem({
    basePath,
    disableNavigation,
    idPrefix,
    pathname,
    thread,
  }: ChatSidebarThreadItemProps) {
    const navigate = useNavigate();
    const [, startTransition] = useTransition();

    const fullHref = `${basePath}/sessions/${thread.id}`;
    const isCurrent =
      pathname === fullHref ||
      pathname === thread.id ||
      pathname === `/${thread.id}`;

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
        id={`${idPrefix}${thread.id}`}
        isCurrent={isCurrent}
        textValue={thread.title}
        onPress={handlePress}
      >
        <Sidebar.MenuItemContent>
          <Sidebar.MenuLabel>{thread.title}</Sidebar.MenuLabel>
        </Sidebar.MenuItemContent>
        {thread.updatedAt ? (
          <Sidebar.MenuChip
            className={cn('hide-on-hover', dropdownOpen && 'hidden')}
          >
            <span className='text-muted text-[10px] leading-none'>
              {formatCompactRelativeTime(thread.updatedAt)}
            </span>
          </Sidebar.MenuChip>
        ) : null}

        <Sidebar.MenuActions className='ml-auto'>
          <Sidebar.MenuAction
            aria-label={`Archive ${thread.title}`}
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
              aria-label={`More actions for ${thread.title}`}
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
              <Dropdown.Menu aria-label={`${thread.title} actions`}>
                <Dropdown.Item>
                  <Icon data={Pencil} />
                  <Label>Rename</Label>
                </Dropdown.Item>
                <Dropdown.Item>
                  <Icon data={Copy} />
                  <Label>Copy Session Id</Label>
                </Dropdown.Item>
                <Dropdown.Item>
                  <Icon data={LogoMarkdown} />
                  <Label>Export Markdown</Label>
                </Dropdown.Item>
                <Separator />
                <Dropdown.Item>
                  <Icon data={Archive} />
                  <Label>Archive</Label>
                </Dropdown.Item>
                <Dropdown.Item variant='danger'>
                  <Icon data={TrashBin} className='text-danger' />
                  <Label>Delete</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown>
        </Sidebar.MenuActions>
      </Sidebar.MenuItem>
    );
  },
  (prev, next) => {
    const prevIsCurrent =
      prev.pathname === `${prev.basePath}/sessions/${prev.thread.id}` ||
      prev.pathname === prev.thread.id ||
      prev.pathname === `/${prev.thread.id}`;

    const nextIsCurrent =
      next.pathname === `${next.basePath}/sessions/${next.thread.id}` ||
      next.pathname === next.thread.id ||
      next.pathname === `/${next.thread.id}`;

    return (
      prev.thread.id === next.thread.id &&
      prev.thread.title === next.thread.title &&
      prevIsCurrent === nextIsCurrent &&
      prev.disableNavigation === next.disableNavigation
    );
  },
);
