import type { Meta, StoryObj } from '@storybook/react';

import { Icon } from '@/icon';

import { ChatLoader, ChatMessage, Markdown, TextShimmer } from './index';
const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/AI/ChatMessage',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
const Wrapper = ({ children }: { children: React.ReactNode }) => (
  <div className='mx-auto flex w-full max-w-[714px] flex-col gap-8'>
    {children}
  </div>
);
export const Default: Story = {
  render: () => (
    <Wrapper>
      <ChatMessage.User>
        <ChatMessage.Bubble>
          <ChatMessage.Content>
            Can you explain how compound components help AI chat UIs stay
            SDK-agnostic?
          </ChatMessage.Content>
        </ChatMessage.Bubble>
      </ChatMessage.User>
      <ChatMessage.Assistant>
        <ChatMessage.Avatar alt='Assistant' fallback='AI' show />
        <ChatMessage.Body>
          <ChatMessage.Content>
            Compound components let you compose message layout explicitly while
            keeping state in your app layer.
          </ChatMessage.Content>
          <ChatMessage.Actions>
            <ChatMessage.Action aria-label='Copy' tooltip='Copy'>
              <Icon icon='hugeicons:copy' />
            </ChatMessage.Action>
            <ChatMessage.Action
              aria-label='Good response'
              tooltip='Good response'
            >
              <Icon icon='hugeicons:thumbs-up' />
            </ChatMessage.Action>
            <ChatMessage.Action
              aria-label='Bad response'
              tooltip='Bad response'
            >
              <Icon icon='hugeicons:thumbs-down' />
            </ChatMessage.Action>
            <ChatMessage.Action aria-label='Regenerate' tooltip='Regenerate'>
              <Icon icon='hugeicons:arrow-uturn-ccw-left' />
            </ChatMessage.Action>
          </ChatMessage.Actions>
        </ChatMessage.Body>
      </ChatMessage.Assistant>
    </Wrapper>
  ),
};
const markdown =
  'Here is a concise answer with **markdown** support:\n\n```ts\nexport type ChatStatus = "ready" | "streaming";\n```\n\nThe UI stays presentation-only — your SDK owns the message array.';
export const WithMarkdown: Story = {
  name: 'With Markdown',
  render: () => (
    <Wrapper>
      <ChatMessage.User>
        <ChatMessage.Bubble>
          <ChatMessage.Content>
            Show me markdown inside assistant messages.
          </ChatMessage.Content>
        </ChatMessage.Bubble>
      </ChatMessage.User>
      <ChatMessage.Assistant>
        <ChatMessage.Avatar alt='Assistant' fallback='AI' show />
        <ChatMessage.Body>
          <ChatMessage.Content>
            <Markdown>{markdown}</Markdown>
          </ChatMessage.Content>
        </ChatMessage.Body>
      </ChatMessage.Assistant>
    </Wrapper>
  ),
};
export const Loading: Story = {
  render: () => (
    <Wrapper>
      <ChatMessage.User>
        <ChatMessage.Bubble>
          <ChatMessage.Content>
            What is the weather in San Francisco?
          </ChatMessage.Content>
        </ChatMessage.Bubble>
      </ChatMessage.User>
      <ChatMessage.Assistant>
        <ChatMessage.Avatar alt='Assistant' fallback='AI' show />
        <ChatMessage.Body>
          <TextShimmer>Thinking...</TextShimmer>
          <ChatLoader.Dots label='Thinking...' />
        </ChatMessage.Body>
      </ChatMessage.Assistant>
      <ChatLoader.Skeleton label='Loading response' />
    </Wrapper>
  ),
};
