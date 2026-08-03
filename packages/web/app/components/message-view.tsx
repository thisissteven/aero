import {
  ChainOfThought,
  ChatMessage,
  ChatMessageActions,
  Markdown,
} from '@aero/ui';

import type { AeroMessage } from '../../server/services/harness/types';

function getText(message: AeroMessage) {
  return message.parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('');
}

function getReasoning(message: AeroMessage) {
  return message.parts.find((part) => part.type === 'reasoning');
}

export function MessageView({ message }: { message: AeroMessage }) {
  const text = getText(message);
  const reasoning = getReasoning(message);

  if (message.role === 'user') {
    return (
      <ChatMessage.User>
        <ChatMessage.Bubble>
          <ChatMessage.Content>{text}</ChatMessage.Content>
        </ChatMessage.Bubble>
      </ChatMessage.User>
    );
  }

  return (
    <ChatMessage.Assistant>
      <ChatMessage.Avatar alt='Assistant' fallback='AI' />

      <ChatMessage.Body>
        <ChatMessage.Content>
          <Markdown>{text}</Markdown>
        </ChatMessage.Content>

        {reasoning ? (
          <ChainOfThought>
            <ChainOfThought.Trigger>Thought process</ChainOfThought.Trigger>

            <ChainOfThought.Content>
              <ChainOfThought.Steps>
                <ChainOfThought.Step label='Reasoning'>
                  <Markdown>{reasoning.text}</Markdown>
                </ChainOfThought.Step>
              </ChainOfThought.Steps>
            </ChainOfThought.Content>
          </ChainOfThought>
        ) : null}

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
}
