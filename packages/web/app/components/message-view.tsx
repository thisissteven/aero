import { memo, useMemo } from 'react';

import {
  ChainOfThought,
  ChatMessage,
  ChatMessageActions,
  Markdown,
  Skeleton,
} from '@aero/ui';

import { ToolCallView } from '@/components/tool-call-view';

import type { AeroMessage } from '../../server/services/harness/types';

export type ConversationItem =
  | { role: 'user'; messages: AeroMessage[] }
  | { role: 'assistant'; messages: AeroMessage[] };

function MessageSkeleton({ role }: { role: ConversationItem['role'] }) {
  if (role === 'user') {
    return (
      <div className='flex justify-end'>
        <Skeleton className='h-12 w-48 rounded-2xl' />
      </div>
    );
  }

  return (
    <div className='space-y-3'>
      <Skeleton className='h-4 w-3/4 rounded-lg' />
      <Skeleton className='h-4 w-1/2 rounded-lg' />
      <Skeleton className='h-4 w-2/3 rounded-lg' />
    </div>
  );
}

export const MessageView = memo(
  function MessageView({
    group,
    hidden,
  }: {
    group: ConversationItem;
    hidden?: boolean;
  }) {
    const messages = group.messages;

    const parts = messages.flatMap((message) => message.parts);

    if (hidden) {
      return <MessageSkeleton role={group.role} />;
    }

    if (group.role === 'user') {
      const text = parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('');

      return (
        <ChatMessage.User>
          <ChatMessage.Bubble className='max-w-4/5 wrap-break-word'>
            <ChatMessage.Content>{text}</ChatMessage.Content>
          </ChatMessage.Bubble>
        </ChatMessage.User>
      );
    }

    const baseKey = messages.map((m) => m.id).join('-');

    const copyText = useMemo(
      () =>
        parts
          .filter((part) => part.type === 'text')
          .map((part) => part.text.trim())
          .filter(Boolean)
          .join('\n\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim(),
      [parts],
    );

    return (
      <ChatMessage.Assistant>
        <ChatMessage.Avatar alt='Assistant' fallback='AI' />

        <ChatMessage.Body>
          <ChatMessage.Content>
            {parts.map((part, index) => {
              const blockId = `${baseKey}-part-${index}`;

              switch (part.type) {
                case 'text':
                  return (
                    <Markdown id={blockId} key={blockId}>
                      {part.text}
                    </Markdown>
                  );

                case 'reasoning':
                  return (
                    <ChainOfThought key={blockId}>
                      <ChainOfThought.Trigger>Reasoning</ChainOfThought.Trigger>

                      <ChainOfThought.Content>
                        <ChainOfThought.Steps>
                          <ChainOfThought.Step>
                            <Markdown id={`${blockId}-reason`}>
                              {part.text}
                            </Markdown>
                          </ChainOfThought.Step>
                        </ChainOfThought.Steps>
                      </ChainOfThought.Content>
                    </ChainOfThought>
                  );

                case 'tool':
                  return <ToolCallView key={blockId} part={part} />;

                default:
                  return null;
              }
            })}
          </ChatMessage.Content>

          <ChatMessageActions>
            <ChatMessageActions.Copy
              aria-label='Copy'
              tooltip='Copy'
              onPress={async () => {
                if (!copyText) return;

                await navigator.clipboard.writeText(copyText);
              }}
            />
            <ChatMessageActions.Regenerate
              aria-label='Regenerate'
              tooltip='Regenerate'
            />
          </ChatMessageActions>
        </ChatMessage.Body>
      </ChatMessage.Assistant>
    );
  },
  (prev, next) => {
    if (prev.hidden !== next.hidden) return false;

    if (prev.group.role !== next.group.role) return false;
    if (prev.group.messages.length !== next.group.messages.length) return false;

    return prev.group.messages.every((msg, idx) => {
      const nextMsg = next.group.messages[idx];

      return msg.id === nextMsg.id && msg.createdAt === nextMsg.createdAt;
    });
  },
);

MessageView.displayName = 'MessageView';
