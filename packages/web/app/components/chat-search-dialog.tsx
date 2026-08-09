import { Comment, Magnifier } from '@gravity-ui/icons';
import { useRef, useState } from 'react';

import { cn, Command, Kbd, Spinner } from '@aero/ui';

import { useSessions } from '@/app/hooks/api/sessions';
import { useDebounce } from '@/app/hooks/useDebounce';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { formatCompactRelativeTime } from '@/app/lib';

import type { ChatSession } from '../data/chat';
import type { AeroSessionSummary } from '../../server/services/harness/types';

export interface ChatSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (session: ChatSession | AeroSessionSummary) => void;
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

  const sessionsQuery = useSessions(
    undefined,
    debouncedSearch || undefined,
    'title',
  );

  const {
    items: sessions,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteScroll<ChatSession | AeroSessionSummary>(sessionsQuery, {
    search: debouncedSearch,
    rootRef: listRef,
    limitWithoutSearch: 10,
  });

  const handleOpenChange = (open: boolean) => {
    if (!open) setSearchValue('');
    onOpenChange(open);
  };

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
              shouldFocusWrap={false}
              autoFocus={false}
              renderEmptyState={() => (
                <div className='text-muted flex h-16 items-center justify-center text-sm'>
                  {sessionsQuery.isFetching
                    ? 'Searching...'
                    : 'No chats match that search.'}
                </div>
              )}
              className='scroll-py-8'
            >
              <Command.Group
                heading={debouncedSearch ? 'Search results' : 'Recent chats'}
                className='pb-0.5'
              >
                {sessions.map((session) => {
                  const preview =
                    'preview' in session ? session.preview : 'Recent chat';

                  const updatedAtStr = formatCompactRelativeTime(
                    session.updatedAt,
                  );

                  return (
                    <Command.Item
                      key={session.id}
                      id={session.id}
                      textValue={`${session.title} ${preview}`}
                      onAction={() => onSelect(session)}
                    >
                      <Comment />

                      <div className='flex min-w-0 flex-col'>
                        <span className='text-foreground truncate text-sm font-medium'>
                          {session.title}
                        </span>

                        <span className='text-muted truncate text-xs'>
                          {preview}
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
