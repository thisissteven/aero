import { ChatMessage, cn } from '@aero/ui';
import { memo, useMemo } from 'react';
import { Markdown } from '@/app/components/markdown/markdown';
import { ChatQuote } from '@/app/components/message-view/chat-quote';
import {
  MessageActionsCopy,
  MessageActionsFork,
  MessageActionsPin,
  MessageActionsRevert,
} from '@/app/components/message-view/message-actions';
import { StyledText } from '@/app/components/message-view/styled-text';
import { ExternalFileAttachment } from '@/app/features/chat-page/chat-input/external-parts-store';
import { FileAttachmentsView } from '@/app/features/chat-page/chat-input/file-attachments/file-attachments';
import { formatDateTime } from '@/app/lib/date';
import { AeroConversationTurn } from '@/server/services/harness/types';

/**
 * A chat-quote part bundles the quoted excerpt and the user's reply into a
 * single text field, separated by a blank line:
 */
function parseChatQuotePart(text: string): { quote: string; comment: string } {
  const lines = text.split('\n');

  let end = 0;
  while (end < lines.length && /^>/.test(lines[end])) end++;

  const quoteLines = lines.slice(0, end);
  while (
    quoteLines.length > 0 &&
    /^>\s*$/.test(quoteLines[quoteLines.length - 1])
  ) {
    quoteLines.pop();
  }

  let start = end;
  while (start < lines.length && lines[start].trim() === '') start++;

  return {
    quote: quoteLines.map((line) => line.replace(/^>\s?/, '')).join('\n'),
    comment: lines.slice(start).join('\n'),
  };
}

type Block =
  | { type: 'chat-quote'; quote: string; comment: string }
  | { type: 'text'; text: string };

interface UserChatBubbleProps {
  turn: AeroConversationTurn;
  forkMessageId: string;
}

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
  const { blocks, attachments } = useMemo(() => {
    const attachments: ExternalFileAttachment[] = [];
    const quoteBlocks: Block[] = [];
    const textBlocks: Block[] = [];
    const compactionBlocks: Block[] = [];
    const subtaskBlocks: Block[] = [];

    for (const part of turn.parts) {
      switch (part.type) {
        case 'text': {
          if (part.metadata?.kind === 'chat-quote') {
            const { quote, comment } = parseChatQuotePart(part.text);
            quoteBlocks.push({ type: 'chat-quote', quote, comment });
          } else {
            textBlocks.push({ type: 'text', text: part.text });
          }
          break;
        }
        case 'compaction':
          compactionBlocks.push({ type: 'text', text: '/compact' });
          break;
        case 'subtask':
          subtaskBlocks.push({ type: 'text', text: part.prompt });
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

    // Arrange in the requested order: quotes -> user text -> compaction -> subtask
    const blocks = [
      ...quoteBlocks,
      ...textBlocks,
      ...compactionBlocks,
      ...subtaskBlocks,
    ];

    return { blocks, attachments };
  }, [turn.parts]);

  const isExpandedSkill =
    turn.parts.length === 1 &&
    turn.parts[0].type === 'text' &&
    turn.parts[0].metadata?.kind === 'skill';

  if (isExpandedSkill) {
    return (
      <ChatMessage.User className='relative'>
        <ChatMessage.Bubble className='max-w-4/5 px-3 rounded-xl'>
          <div className='p-1'>
            <Markdown id={turn.id} streaming={false} streamRevealPreset='off'>
              {blocks
                .map((b) =>
                  b.type === 'chat-quote'
                    ? `${b.quote}\n\n${b.comment}`
                    : b.text,
                )
                .join('\n\n')}
            </Markdown>
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
            <MessageActionsCopy
              copyText={blocks
                .map((b) =>
                  b.type === 'chat-quote'
                    ? `${b.quote}\n\n${b.comment}`
                    : b.text,
                )
                .join('\n\n')}
            />
          </div>
        </div>
      </ChatMessage.User>
    );
  }

  return (
    <ChatMessage.User className='relative'>
      {attachments.length > 0 && (
        <div className='mb-2 flex w-full flex-col items-end gap-1.5'>
          <div className='max-w-4/5'>
            <FileAttachmentsView
              attachments={attachments}
              variant='sent'
              className='px-0'
            />
          </div>
        </div>
      )}

      <div className='flex w-full flex-col items-end gap-2'>
        {blocks.map((block, i) => {
          if (block.type === 'chat-quote') {
            const hasComment = block.comment.trim().length > 0;

            return (
              <div key={i} className='w-full flex flex-col items-end gap-1.5'>
                <ChatQuote text={block.quote} />

                {/* Comment: Rendered inside a bubble ONLY if there is a comment */}
                {hasComment && (
                  <ChatMessage.Bubble className='max-w-4/5 px-3 rounded-xl text-sm'>
                    <StyledText text={block.comment} />
                  </ChatMessage.Bubble>
                )}
              </div>
            );
          }

          // Regular reply: Rendered inside a bubble
          return (
            <ChatMessage.Bubble
              key={i}
              className='max-w-4/5 px-3 rounded-xl text-sm'
            >
              <StyledText text={block.text} />
            </ChatMessage.Bubble>
          );
        })}
      </div>

      <div className='mt-3 flex w-full items-center justify-end gap-2 pb-3'>
        <div className='text-muted text-xs select-none'>
          {formatDateTime(turn.createdAt)}
        </div>
        <div>
          <MessageActionsRevert messageId={forkMessageId} />
          <MessageActionsFork messageId={forkMessageId} />
          <MessageActionsPin messageId={turn.id} />
          <MessageActionsCopy
            copyText={blocks
              .map((b) =>
                b.type === 'chat-quote' ? `${b.quote}\n\n${b.comment}` : b.text,
              )
              .join('\n\n')}
          />
        </div>
      </div>
    </ChatMessage.User>
  );
}, areUserChatBubblePropsEqual);
