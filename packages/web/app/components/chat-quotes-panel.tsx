import { cn, Popover } from '@aero/ui';
import { Comment } from '@gravity-ui/icons';
import React from 'react';

import { useExternalPartsStore } from '@/app/features/chat-page/chat-input/external-parts-store';

import { ChatQuoteCard } from './chat-quote-card';

export const ChatQuotesPanel = React.memo(function ChatQuotesPanel() {
  const quotes = useExternalPartsStore((s) => s.chatQuotes);

  if (quotes.length === 0) {
    return null;
  }

  return (
    <Popover>
      <Popover.Trigger
        className={cn(
          'mb-2',
          'border-separator bg-surface text-foreground inline-flex w-fit items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs',
          'hover:bg-default transition-colors',
        )}
      >
        <Comment className='size-3.5' />
        <span>Chat quotes</span>
        <span className='bg-accent/15 text-accent rounded-full px-1.5 text-[10px] font-medium tabular-nums'>
          {quotes.length}
        </span>
      </Popover.Trigger>

      <Popover.Content
        placement='top start'
        className='w-[520px] max-w-[calc(100vw-24px)] p-0 rounded-xl overflow-hidden'
      >
        <Popover.Dialog className='p-0'>
          <div
            className={cn(
              'divide-separator',
              'max-h-[40vh] overflow-y-auto divide-y scrollbar-thin',
            )}
          >
            {quotes.map((quote, index) => (
              <ChatQuoteCard key={quote.id} quote={quote} index={index} />
            ))}
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
});
