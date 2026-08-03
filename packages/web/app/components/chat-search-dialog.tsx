import { Comment, Magnifier } from '@gravity-ui/icons';

import { Kbd } from '@aero/ui';
import { Command } from '@aero/ui';

import { formatCompactRelativeTime } from '@/lib';

import type { ChatThread } from '../data/chat';
import type { AeroSessionSummary } from '../../server/services/harness/types';

export interface ChatSearchDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  threads: readonly (ChatThread | AeroSessionSummary)[];
  onSelect: (thread: ChatThread | AeroSessionSummary) => void;
}

export function ChatSearchDialog({
  isOpen,
  onOpenChange,
  onSelect,
  threads,
}: ChatSearchDialogProps) {
  return (
    <Command>
      <Command.Backdrop isOpen={isOpen} onOpenChange={onOpenChange}>
        <Command.Container>
          <Command.Dialog>
            <Command.InputGroup>
              <Command.InputGroup.Prefix>
                <Magnifier />
              </Command.InputGroup.Prefix>
              <Command.InputGroup.Input placeholder='Search your chats' />
              <Command.InputGroup.ClearButton />
              <Command.InputGroup.Suffix>
                <Kbd className='text-xs'>
                  <Kbd.Content>Esc</Kbd.Content>
                </Kbd>
              </Command.InputGroup.Suffix>
            </Command.InputGroup>
            <Command.List
              renderEmptyState={() => (
                <div className='text-muted flex h-16 items-center justify-center text-sm'>
                  No chats match that search.
                </div>
              )}
            >
              <Command.Group heading='Recent chats'>
                {threads.map((thread) => {
                  const preview =
                    'preview' in thread ? thread.preview : 'Recent chat';
                  const updatedAtStr = formatCompactRelativeTime(
                    thread.updatedAt,
                  );

                  return (
                    <Command.Item
                      key={thread.id}
                      textValue={`${thread.title} ${preview}`}
                      onAction={() => onSelect(thread)}
                    >
                      <Comment />
                      <div className='flex min-w-0 flex-col'>
                        <span className='text-foreground truncate text-sm font-medium'>
                          {thread.title}
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
