import type { Meta, StoryObj } from '@storybook/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ChainOfThought,
  ChatConversation,
  ChatMessage,
  ChatMessageActions,
  Markdown,
  PromptInput,
} from './index';

const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/AI/ChatConversation',
} satisfies Meta;

export default meta;
type Story = StoryObj<any>;

interface Message {
  id: string;
  role: 'assistant' | 'user';
  text: string;
  trace?: boolean;
}

const messages: Message[] = [
  {
    id: '1',
    role: 'user',
    text: 'How does auto-scroll work in chat UIs?',
  },
  {
    id: '2',
    role: 'assistant',
    text: `Stick-to-bottom keeps the viewport pinned to the latest message while you stream.

It also leaves the user in control: once they scroll away from the bottom, new content can arrive without snapping the viewport away from what they are reading.`,
  },
  {
    id: '3',
    role: 'user',
    text: 'What happens when the assistant is doing multiple steps?',
  },
  {
    id: '4',
    role: 'assistant',
    text: 'You can combine the conversation viewport with reasoning and tool UI so the whole exchange remains in one scrollable surface.',
    trace: true,
  },
];

function MessageView({
  message,
  showActions = false,
}: {
  message: Message;
  showActions?: boolean;
}) {
  return message.role === 'user' ? (
    <ChatMessage.User>
      <ChatMessage.Bubble>
        <ChatMessage.Content>{message.text}</ChatMessage.Content>
      </ChatMessage.Bubble>
    </ChatMessage.User>
  ) : (
    <ChatMessage.Assistant>
      <ChatMessage.Avatar show alt='Assistant' fallback='AI' />
      <ChatMessage.Body>
        <ChatMessage.Content>
          <Markdown>{message.text}</Markdown>
        </ChatMessage.Content>
        {message.trace ? (
          <ChainOfThought defaultExpanded>
            <ChainOfThought.Trigger>Thought for 2s</ChainOfThought.Trigger>
            <ChainOfThought.Content>
              <ChainOfThought.Steps>
                <ChainOfThought.Step label='Check scroll behavior'>
                  Verified the viewport remains pinned while the assistant
                  streams.
                </ChainOfThought.Step>
                <ChainOfThought.Step label='Compose response'>
                  Added reasoning UI inline with the assistant message body.
                </ChainOfThought.Step>
              </ChainOfThought.Steps>
            </ChainOfThought.Content>
          </ChainOfThought>
        ) : null}
        {showActions ? (
          <ChatMessageActions>
            <ChatMessageActions.Copy aria-label='Copy' tooltip='Copy' />
            <ChatMessageActions.Regenerate
              aria-label='Regenerate'
              tooltip='Regenerate'
            />
          </ChatMessageActions>
        ) : null}
      </ChatMessage.Body>
    </ChatMessage.Assistant>
  );
}

function DefaultDemo() {
  return (
    <div className='flex h-[520px] w-[640px] flex-col overflow-hidden'>
      <ChatConversation className='flex-1'>
        <ChatConversation.Content className='max-w-[714px] flex-col gap-8 px-4 pt-8 pb-8'>
          {messages.map((message) => (
            <MessageView key={message.id} message={message} />
          ))}
        </ChatConversation.Content>
      </ChatConversation>
    </div>
  );
}

const initialFullChatMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    text: 'Build a settings page with profile and notifications.',
  },
  {
    id: '2',
    role: 'assistant',
    text: `Here is a **settings layout** outline with profile, notifications, and a danger zone section.

- Profile card for avatar, display name, and email
- Notification preferences grouped by channel
- Danger zone with clear destructive affordances`,
    trace: true,
  },
  {
    id: '3',
    role: 'user',
    text: 'Add a compact version that works well in a dashboard drawer.',
  },
  {
    id: '4',
    role: 'assistant',
    text: 'For a drawer, I would reduce section padding, keep labels visible, and move destructive actions behind a confirmation step. The same components can stay responsive with container width constraints.',
  },
];

function FullChatDemo() {
  const [currentMessages, setMessages] = useState(initialFullChatMessages);
  const [value, setValue] = useState('');
  const [status, setStatus] = useState<'ready' | 'streaming' | 'submitted'>(
    'ready',
  );
  const timers = useRef<number[]>([]);
  const clearTimers = useCallback(() => {
    timers.current.forEach((timer) => window.clearTimeout(timer));
    timers.current = [];
  }, []);

  useEffect(() => () => clearTimers(), [clearTimers]);

  const stop = () => {
    clearTimers();
    setStatus('ready');
  };
  const submit = () => {
    const text = value.trim();
    if (!text || status !== 'ready') return;
    setMessages((current) => [
      ...current,
      { id: String(Date.now()), role: 'user', text },
    ]);
    setValue('');
    setStatus('submitted');
    clearTimers();
    timers.current.push(
      window.setTimeout(() => setStatus('streaming'), 300),
      window.setTimeout(() => {
        setMessages((current) => [
          ...current,
          {
            id: String(Date.now() + 1),
            role: 'assistant',
            text: 'This is a mocked assistant reply rendered with @aero/ui AI components.',
          },
        ]);
        setStatus('ready');
      }, 1200),
    );
  };

  return (
    <div className='flex h-[640px] w-[760px] flex-col overflow-hidden'>
      <ChatConversation className='flex-1'>
        <ChatConversation.Content className='max-w-[714px] flex-col gap-8 px-4 pt-8 pb-8'>
          {currentMessages.map((message) => (
            <MessageView
              key={message.id}
              message={message}
              showActions={message.role === 'assistant'}
            />
          ))}
        </ChatConversation.Content>
      </ChatConversation>
      <div className='bg-background shrink-0 px-4 pt-3 pb-4'>
        <PromptInput
          status={status}
          value={value}
          onStop={stop}
          onSubmit={submit}
          onValueChange={setValue}
        >
          <PromptInput.Shell>
            <PromptInput.Content>
              <PromptInput.TextArea placeholder='What do you want to know?' />
            </PromptInput.Content>
            <PromptInput.Toolbar>
              <PromptInput.ToolbarEnd>
                <PromptInput.Send />
              </PromptInput.ToolbarEnd>
            </PromptInput.Toolbar>
          </PromptInput.Shell>
          <PromptInput.Footer>
            AI can make mistakes. Check important info.
          </PromptInput.Footer>
        </PromptInput>
      </div>
    </div>
  );
}

const scrollMessages: Message[] = [
  {
    id: '1',
    role: 'user',
    text: 'Can you summarize the release notes?',
  },
  {
    id: '2',
    role: 'assistant',
    text: `The release focuses on the chat surface, component polish, and small API cleanup.

- Chat messages now compose with markdown, sources, and actions
- Conversation viewports keep streaming content readable
- AI components share the same spacing and typography rhythm`,
  },
  {
    id: '3',
    role: 'user',
    text: 'What changed for long conversations?',
  },
  {
    id: '4',
    role: 'assistant',
    text: 'Long threads keep their message column centered while the viewport owns scrolling. The optional jump button can be added when an app wants an explicit return-to-bottom control.',
  },
  {
    id: '5',
    role: 'user',
    text: 'Show me the button treatment.',
  },
  {
    id: '6',
    role: 'assistant',
    text: 'Scroll away from the latest response and the button appears over the lower edge of the conversation. Pressing it returns the viewport to the newest message.',
  },
  {
    id: '7',
    role: 'assistant',
    text: 'The default conversation examples omit this control so teams can choose whether the extra affordance belongs in their product.',
  },
];

function WithScrollButtonDemo() {
  const conversationRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      const conversation = conversationRef.current;
      conversation?.scrollTo({
        behavior: 'auto',
        top: Math.max(
          0,
          conversation.scrollHeight - conversation.clientHeight - 160,
        ),
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, []);

  return (
    <div className='flex h-[520px] w-[640px] flex-col overflow-hidden'>
      <ChatConversation
        ref={conversationRef}
        className='flex-1'
        initial='instant'
      >
        <ChatConversation.Content className='max-w-[714px] flex-col gap-8 px-4 pt-8 pb-8'>
          {scrollMessages.map((message) => (
            <MessageView key={message.id} message={message} />
          ))}
        </ChatConversation.Content>
        <ChatConversation.ScrollButton
          aria-label='Scroll to bottom'
          tooltip='Scroll to bottom'
        />
      </ChatConversation>
    </div>
  );
}

export const Default: Story = { render: () => <DefaultDemo /> };
export const FullChat: Story = {
  name: 'Full Chat',
  render: () => <FullChatDemo />,
};
export const WithScrollButton: Story = {
  name: 'With Scroll Button',
  render: () => <WithScrollButtonDemo />,
};
