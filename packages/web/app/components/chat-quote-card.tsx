import { Button, IconButton, Popover, TextArea } from '@aero/ui';
import { Check, Pencil, TrashBin } from '@gravity-ui/icons';
import React, { useState } from 'react';

import type { ChatQuoteItem } from '@/app/features/chat-page/chat-input/external-parts-store';
import { useExternalPartsStore } from '@/app/features/chat-page/chat-input/external-parts-store';

interface ChatQuoteCardProps {
  quote: ChatQuoteItem;
  index: number;
}

export const ChatQuoteCard = React.memo(function ChatQuoteCard({
  quote,
  index,
}: ChatQuoteCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(quote.comment);

  const updateChatQuote = useExternalPartsStore((s) => s.updateChatQuote);
  const removeChatQuote = useExternalPartsStore((s) => s.removeChatQuote);

  const startEdit = () => {
    setDraft(quote.comment);
    setIsEditing(true);
  };

  const commit = () => {
    updateChatQuote(quote.id, { comment: draft.trim() });
    setIsEditing(false);
  };

  const cancel = () => {
    setDraft(quote.comment);
    setIsEditing(false);
  };

  const showCommentSection = isEditing || quote.comment.length > 0;

  return (
    <div>
      {/* Header */}
      <div className='flex items-center justify-between bg-default pl-3 pr-1.5'>
        <div className='space-x-1 py-1.5 w-full'>
          <span className='text-muted text-xs tabular-nums'>{index + 1}.</span>
          <span className='text-foreground/80 truncate text-xs font-medium'>
            Quoted from an earlier message
          </span>
        </div>

        <div className='flex shrink-0 items-center'>
          {isEditing ? (
            <>
              <IconButton
                variant='ghost'
                aria-label='Save comment'
                onPress={commit}
              >
                <Check />
              </IconButton>
              <IconButton
                variant='ghost'
                aria-label='Delete quote'
                onPress={() => removeChatQuote(quote.id)}
              >
                <TrashBin />
              </IconButton>
            </>
          ) : (
            <>
              <IconButton
                variant='ghost'
                aria-label='Edit comment'
                onPress={startEdit}
              >
                <Pencil />
              </IconButton>
              <IconButton
                variant='ghost'
                aria-label='Delete quote'
                onPress={() => removeChatQuote(quote.id)}
              >
                <TrashBin />
              </IconButton>
            </>
          )}
        </div>
      </div>

      {/* Selected text */}
      <div className='border-separator border-t px-3 py-2'>
        <div className='text-muted text-[10px] font-medium tracking-wide uppercase'>
          Selected text
        </div>
        <div className='text-foreground mt-1 text-sm leading-snug'>
          {quote.selection}
        </div>
      </div>

      {/* User comment */}
      {showCommentSection && (
        <div className='border-separator border-t px-3 py-2'>
          <div className='text-muted text-[10px] font-medium tracking-wide uppercase'>
            User comment
          </div>

          {isEditing ? (
            <TextArea
              autoFocus
              variant='secondary'
              aria-label='User comment'
              placeholder='Add an optional comment...'
              className='mt-1 min-h-9 w-full resize-none rounded-lg'
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  commit();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  cancel();
                }
              }}
            />
          ) : (
            <div className='text-foreground mt-1 text-sm leading-snug'>
              {quote.comment}
            </div>
          )}
        </div>
      )}
    </div>
  );
});
