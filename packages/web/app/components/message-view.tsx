import React, { memo } from 'react';

import {
  ChainOfThought,
  ChatMessage,
  ChatMessageActions,
  Markdown,
} from '@aero/ui';

import { ToolCallView } from '@/components/tool-call-view';

import type { AeroMessage } from '../../server/services/harness/types';

export type ConversationItem =
  | { role: 'user'; messages: AeroMessage[] }
  | { role: 'assistant'; messages: AeroMessage[] };

export const MessageView = memo(
  function MessageView({ group }: { group: ConversationItem }) {
    const messages = group.messages;

    // Extract parts safely
    const parts = messages.flatMap((message) => message.parts);

    if (group.role === 'user') {
      const text = parts
        .filter((part) => part.type === 'text')
        .map((part) => part.text)
        .join('');

      return (
        <ChatMessage.User>
          <ChatMessage.Bubble>
            <ChatMessage.Content>{text}</ChatMessage.Content>
          </ChatMessage.Bubble>
        </ChatMessage.User>
      );
    }

    // Use a stable foundation key compound from actual message identities rather than map indices
    const baseKey = messages.map((m) => m.id).join('-');

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
                      <ChainOfThought.Trigger>
                        Thought process
                      </ChainOfThought.Trigger>

                      <ChainOfThought.Content>
                        <ChainOfThought.Steps>
                          <ChainOfThought.Step label='Reasoning'>
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
            <ChatMessageActions.Copy aria-label='Copy' tooltip='Copy' />
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
    // Deep equality verification bypass to strictly avoid re-renders unless data properties adjust
    if (prev.group.role !== next.group.role) return false;
    if (prev.group.messages.length !== next.group.messages.length) return false;

    return prev.group.messages.every((msg, idx) => {
      const nextMsg = next.group.messages[idx];
      return msg.id === nextMsg.id && msg.createdAt === nextMsg.createdAt;
    });
  },
);

MessageView.displayName = 'MessageView';
