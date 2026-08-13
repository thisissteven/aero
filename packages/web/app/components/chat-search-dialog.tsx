import { Comment, Gear, Magnifier } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';
import { useRef, useState } from 'react';

import { cn, Command, CommandItem, Kbd, Spinner } from '@aero/ui';

import { useSessions } from '@/app/hooks/api/sessions';
import { useDebounce } from '@/app/hooks/useDebounce';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { formatCompactRelativeTime } from '@/app/lib';
import { useSettingsModalStore } from '@/app/providers/settings/settings-store';

import type { AeroSessionSummary } from '../../server/services/harness/types';

export interface ChatSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (callback: () => void) => void;
}

export function ChatSearchDialog({
  isOpen,
  onOpenChange,
  onSelect,
}: ChatSearchDialogProps) {
  const [searchValue, setSearchValue] = useState('');
  const debouncedSearch = useDebounce(searchValue.trim(), 300);

  // Ref for the scrollable container (Command.List / RAC Menu wrapper)
  const listRef = useRef<HTMLDivElement | null>(null);

  const sessionsQuery = useSessions(debouncedSearch || undefined);

  const {
    items: sessions,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteScroll<AeroSessionSummary>(sessionsQuery, {
    search: debouncedSearch,
    rootRef: listRef,
    limitWithoutSearch: 10,
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) setSearchValue('');
    onOpenChange(open);
  };

  const navigate = useNavigate();
  const openSettingsModal = useSettingsModalStore((state) => state.openModal);

  return (
    <Command>
      <Command.Backdrop isOpen={isOpen} onOpenChange={handleOpenChange}>
        <Command.Container>
          <Command.Dialog filter={() => true} allowEscape>
            <Command.InputGroup>
              <Command.InputGroup.Prefix>
                <Magnifier />
              </Command.InputGroup.Prefix>

              <Command.InputGroup.Input
                placeholder='Search your chats'
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                autoFocus
              />

              <Command.InputGroup.ClearButton
                onClick={() => setSearchValue('')}
              />

              <Command.InputGroup.Suffix>
                <Kbd className='text-xs'>
                  <Kbd.Content>Esc</Kbd.Content>
                </Kbd>
              </Command.InputGroup.Suffix>
            </Command.InputGroup>

            <Command.List
              ref={listRef}
              selectedKeys={[]}
              selectionMode='single'
              autoFocus
              renderEmptyState={() => (
                <div className='text-muted flex h-16 items-center justify-center text-sm'>
                  {sessionsQuery.isFetching
                    ? 'Searching...'
                    : 'No chats match that search.'}
                </div>
              )}
              className='scroll-py-8'
            >
              {!debouncedSearch && (
                <Command.Group heading='Actions' className='pb-0.5'>
                  <CommandItem
                    onAction={() =>
                      onSelect(() => {
                        navigate({
                          to: `/new`,
                        });
                      })
                    }
                  >
                    <Icon data={Comment} />
                    New Chat
                  </CommandItem>
                  <CommandItem onAction={() => onSelect(openSettingsModal)}>
                    <Icon data={Gear} />
                    Settings
                  </CommandItem>
                </Command.Group>
              )}
              {!debouncedSearch && (
                <Command.Group heading='Recent Chats' className='pb-0.5'>
                  {sessions.map((session) => {
                    const updatedAtStr = formatCompactRelativeTime(
                      session.updatedAt,
                    );

                    return (
                      <Command.Item
                        key={session.id}
                        id={session.id}
                        textValue={`${session.title} Recent chat`}
                        onAction={() =>
                          onSelect(() => {
                            navigate({
                              to: `/sessions/${session.id}`,
                            });
                          })
                        }
                      >
                        <Comment />

                        <div className='flex min-w-0 flex-col'>
                          <span className='text-foreground truncate text-sm font-medium'>
                            {session.title}
                          </span>

                          <span className='text-muted truncate text-xs'>
                            Recent chat
                          </span>
                        </div>

                        <span className='text-muted ml-auto shrink-0 text-[11px]'>
                          {updatedAtStr}
                        </span>
                      </Command.Item>
                    );
                  })}
                </Command.Group>
              )}
              {!!debouncedSearch && (
                <Command.Group heading='Search results' className='pb-0.5'>
                  {sessions.map((session) => {
                    const updatedAtStr = formatCompactRelativeTime(
                      session.updatedAt,
                    );

                    return (
                      <Command.Item
                        key={session.id}
                        id={session.id}
                        textValue={`${session.title} Recent chat`}
                        onAction={() =>
                          onSelect(() =>
                            navigate({ to: `/sessions/${session.id}` }),
                          )
                        }
                      >
                        <Icon data={Comment} />

                        <div className='flex min-w-0 flex-col'>
                          <span className='text-foreground truncate text-sm font-medium'>
                            {session.title}
                          </span>

                          <span className='text-muted truncate text-xs'>
                            Recent chat
                          </span>
                        </div>

                        <span className='text-muted ml-auto shrink-0 text-[11px]'>
                          {updatedAtStr}
                        </span>
                      </Command.Item>
                    );
                  })}

                  {/* Loader / Sentinel kept inside Command.Group as a valid focusable Command.Item */}
                  {hasNextPage && (
                    <Command.Item
                      key='sentinel-loader'
                      id='sentinel-loader'
                      textValue='loading more items'
                      ref={loadMoreRef}
                      className='flex cursor-default items-center justify-center py-2 text-sm aria-selected:bg-transparent'
                      isDisabled
                    >
                      <div
                        className={cn(
                          'flex items-center justify-center transition-opacity',
                          isFetchingNextPage ? 'opacity-100' : 'opacity-0',
                        )}
                      >
                        <Spinner className='text-muted size-4' />
                      </div>
                    </Command.Item>
                  )}
                </Command.Group>
              )}
            </Command.List>

            <Command.Footer className='justify-between [&_kbd]:h-5 [&_kbd]:text-xs'>
              <div className='flex items-center gap-3'>
                <div className='flex items-center gap-2'>
                  <div className='flex items-center gap-0.5'>
                    <Kbd className='text-xs'>
                      <Kbd.Abbr keyValue='up' />
                    </Kbd>
                    <Kbd className='text-xs'>
                      <Kbd.Abbr keyValue='down' />
                    </Kbd>
                  </div>
                  <span>Navigate</span>
                </div>

                <div className='flex items-center gap-2'>
                  <Kbd>
                    <Kbd.Abbr keyValue='enter' />
                  </Kbd>
                  <span>Open chat</span>
                </div>
              </div>
            </Command.Footer>
          </Command.Dialog>
        </Command.Container>
      </Command.Backdrop>
    </Command>
  );
}
