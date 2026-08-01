import type { Meta, StoryObj } from '@storybook/react';

import { Copy01Icon, HugeiconsIcon, ThumbsUpIcon } from '@aero/ui/icons';

import { ChatMessage, ChatMessageActions } from './index';
const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/AI/ChatMessageActions',
} satisfies Meta;
export default meta;
type Story = StoryObj<any>;
const Assistant = ({ children }: { children: React.ReactNode }) => (
  <ChatMessage.Assistant>
    <ChatMessage.Avatar show alt='Assistant' fallback='AI' />
    <ChatMessage.Body>{children}</ChatMessage.Body>
  </ChatMessage.Assistant>
);
export const Default: Story = {
  render: () => (
    <Assistant>
      <ChatMessage.Content>
        Assistant responses can expose quick actions beneath the message body.
      </ChatMessage.Content>
      <ChatMessageActions>
        <ChatMessageActions.Copy aria-label='Copy' tooltip='Copy' />
        <ChatMessageActions.ThumbsUp
          aria-label='Good response'
          tooltip='Good response'
        />
        <ChatMessageActions.ThumbsDown
          aria-label='Bad response'
          tooltip='Bad response'
        />
        <ChatMessageActions.Regenerate
          aria-label='Regenerate'
          tooltip='Regenerate'
        />
        <ChatMessageActions.Menu aria-label='More actions' tooltip='More' />
      </ChatMessageActions>
    </Assistant>
  ),
};
export const Minimal: Story = {
  render: () => (
    <Assistant>
      <ChatMessage.Content>
        Minimal action set for compact layouts.
      </ChatMessage.Content>
      <ChatMessageActions>
        <ChatMessageActions.Copy aria-label='Copy' tooltip='Copy' />
        <ChatMessageActions.Menu aria-label='More actions' tooltip='More' />
      </ChatMessageActions>
    </Assistant>
  ),
};
export const CustomIcons: Story = {
  name: 'Custom Icons',
  render: () => (
    <Assistant>
      <ChatMessage.Content>
        Swap preset icons via the Icon subcomponents.
      </ChatMessage.Content>
      <ChatMessageActions>
        <ChatMessageActions.Copy aria-label='Copy' tooltip='Copy'>
          <ChatMessageActions.CopyIcon>
            <HugeiconsIcon className='text-accent size-4' icon={Copy01Icon} />
          </ChatMessageActions.CopyIcon>
        </ChatMessageActions.Copy>
        <ChatMessageActions.ThumbsUp
          aria-label='Good response'
          tooltip='Good response'
        >
          <ChatMessageActions.ThumbsUpIcon>
            <HugeiconsIcon
              className='text-success size-4'
              icon={ThumbsUpIcon}
            />
          </ChatMessageActions.ThumbsUpIcon>
        </ChatMessageActions.ThumbsUp>
      </ChatMessageActions>
    </Assistant>
  ),
};
