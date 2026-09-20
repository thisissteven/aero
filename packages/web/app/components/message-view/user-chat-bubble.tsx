import { ChatMessage, cn } from '@aero/ui';
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Markdown } from '@/app/components/markdown/markdown';
import { ChatQuote } from '@/app/components/message-view/chat-quote';
import {
  MessageActionsCopy,
  MessageActionsFork,
  MessageActionsPin,
  MessageActionsRevert,
} from '@/app/components/message-view/message-actions';
import { ExternalFileAttachment } from '@/app/features/chat-page/chat-input/external-parts-store';
import { FileAttachmentsView } from '@/app/features/chat-page/chat-input/file-attachments/file-attachments';
import { formatDateTime } from '@/app/lib/date';
import { useKeepMountedStoreFeed } from '@/app/stores/keep-mounted';
import { AeroConversationTurn } from '@/server/services/harness/types';

/**
 * A chat-quote part bundles the quoted excerpt and the user's reply into a
 * single text field, separated by a blank line:
 *
 *     > quoted line 1
 *     > quoted line 2
 *
 *     user's reply
 *
 * Split them back out so the excerpt renders above the bubble and the
 * reply renders inside it as a normal user message.
 */
function parseChatQuotePart(text: string): { quote: string; comment: string } {
  const lines = text.split('\n');

  // Quote runs from the top until the first line that isn't ">"-prefixed.
  let end = 0;
  while (end < lines.length && /^>/.test(lines[end])) end++;

  const quoteLines = lines.slice(0, end);
  // Drop trailing blank quote lines ("> " or ">") — they're just padding.
  while (
    quoteLines.length > 0 &&
    /^>\s*$/.test(quoteLines[quoteLines.length - 1])
  ) {
    quoteLines.pop();
  }

  // Skip the blank separator line(s) between quote and comment.
  let start = end;
  while (start < lines.length && lines[start].trim() === '') start++;

  return {
    quote: quoteLines.map((line) => line.replace(/^>\s?/, '')).join('\n'),
    comment: lines.slice(start).join('\n'),
  };
}

interface UserChatBubbleProps {
  turn: AeroConversationTurn;
  forkMessageId: string;
}

/**
 * Re-render only when the turn's identity or its part count changes.
 * Streaming appends parts, so `parts.length` is the signal that the bubble
 * gained content; anything else (metadata tweaks, new object identity from
 * the parent) is ignored.
 */
function areUserChatBubblePropsEqual(
  prev: UserChatBubbleProps,
  next: UserChatBubbleProps,
) {
  return (
    prev.turn.id === next.turn.id &&
    prev.turn.parts.length === next.turn.parts.length &&
    prev.forkMessageId === next.forkMessageId
  );
}

export const UserChatBubble = memo(function UserChatBubble({
  turn,
  forkMessageId,
}: {
  turn: AeroConversationTurn;
  forkMessageId: string;
}) {
  const [isOverflowing, setIsOverflowing] = useState(false);

  const bubbleRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);

  const { text, quoteText, attachments } = useMemo(() => {
    const textParts: string[] = [];
    const quoteParts: string[] = [];
    const attachments: ExternalFileAttachment[] = [];

    for (const part of turn.parts) {
      switch (part.type) {
        case 'text': {
          if (part.metadata?.kind === 'chat-quote') {
            const { quote, comment } = parseChatQuotePart(part.text);
            if (quote) quoteParts.push(quote);
            if (comment) textParts.push(comment);
          } else {
            textParts.push(part.text);
          }
          break;
        }
        case 'compaction':
          textParts.push('/compact');
          break;
        case 'subtask':
          textParts.push(part.prompt);
          break;
        case 'file':
          attachments.push({
            id: part.id,
            mime: part.mime,
            filename: part.filename ?? 'file',
            url: part.url,
          });
          break;
      }
    }

    return {
      text: textParts.join('\n\n'),
      quoteText: quoteParts.join('\n\n'),
      attachments,
    };
  }, [turn.parts]);

  useLayoutEffect(() => {
    const el = textRef.current;
    if (!el) return;

    const measure = () => {
      const overflow = el.scrollHeight > 96;
      setIsOverflowing((prev) => (prev !== overflow ? overflow : prev));
    };

    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [text]);

  const isExpanded = useKeepMountedStoreFeed((s) => Boolean(s.ids[turn.id]));
  const setKeep = useKeepMountedStoreFeed((s) => s.setKeep);

  const handleToggle = () => {
    const bubbleEl = bubbleRef.current;
    if (isExpanded && bubbleEl) {
      const scrollContainer = bubbleEl.closest<HTMLElement>('.overflow-y-auto');

      if (scrollContainer) {
        const topOffset = 32;
        const containerRect = scrollContainer.getBoundingClientRect();
        const bubbleRect = bubbleEl.getBoundingClientRect();
        const targetScrollTop =
          scrollContainer.scrollTop +
          (bubbleRect.top - containerRect.top) -
          topOffset;

        scrollContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'instant',
        });
      } else {
        bubbleEl.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }
    setKeep(turn.id, !isExpanded);
  };

  const hasAbove = attachments.length > 0 || quoteText.length > 0;

  const isExpandedSkill =
    turn.parts.length === 1 &&
    turn.parts[0].type === 'text' &&
    turn.parts[0].metadata?.kind === 'skill';

  return (
    <ChatMessage.User ref={bubbleRef} className='relative'>
      {hasAbove && (
        <div className='mb-2 flex w-full flex-col items-end gap-1.5'>
          {attachments.length > 0 && (
            <div className='max-w-4/5'>
              <FileAttachmentsView
                attachments={attachments}
                variant='sent'
                className='px-0'
              />
            </div>
          )}

          {quoteText.length > 0 && <ChatQuote text={quoteText} />}
        </div>
      )}

      <ChatMessage.Bubble
        className={cn(
          'max-w-4/5 px-3 rounded-xl',
          isOverflowing && !isExpanded && 'cursor-pointer',
        )}
        onClick={() => {
          if (isExpanded) return;
          handleToggle();
        }}
      >
        <div className='relative'>
          <div
            ref={textRef}
            className={cn(
              !isExpanded && isOverflowing && 'line-clamp-3',
              isExpandedSkill
                ? 'p-1'
                : 'whitespace-pre-wrap text-sm overflow-hidden break-words',
            )}
          >
            {isExpandedSkill ? (
              <Markdown id={turn.id} streaming={false} streamRevealPreset='off'>
                {text}
              </Markdown>
            ) : text.length > 0 ? (
              text
            ) : (
              <span className='text-sm text-muted'>No message sent.</span>
            )}
          </div>

          {isOverflowing && (
            <button
              type='button'
              className={cn(
                'text-muted mt-1 text-xs opacity-80 transition hover:opacity-100',
                isExpandedSkill && 'ml-1',
              )}
              onClick={(e) => {
                e.stopPropagation();
                handleToggle();
              }}
            >
              {isExpanded ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      </ChatMessage.Bubble>

      <div className='mt-3 flex w-full items-center justify-end gap-2 pb-3'>
        <div className='text-muted text-xs select-none'>
          {formatDateTime(turn.createdAt)}
        </div>
        <div>
          <MessageActionsRevert messageId={forkMessageId} />
          <MessageActionsFork messageId={forkMessageId} />
          <MessageActionsPin messageId={turn.id} />
          <MessageActionsCopy copyText={text} />
        </div>
      </div>
    </ChatMessage.User>
  );
}, areUserChatBubblePropsEqual);
