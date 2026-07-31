import type { Meta, StoryObj } from '@storybook/react';

import { Comment01Icon } from '@aero/ui/icons';
import { HugeiconsIcon } from '@aero/ui/icons';

import { ChatListView } from './index';

const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/AI/ChatListView',
} satisfies Meta;

export default meta;
type Story = StoryObj<typeof meta>;

const chats = [
  {
    id: '1',
    preview: 'Can you help me draft a launch checklist?',
    title: 'Product launch planning',
    updatedAt: '2h ago',
  },
  {
    id: '2',
    preview: 'Summarize the customer feedback from last week.',
    title: 'Customer feedback review',
    updatedAt: 'Yesterday',
  },
  {
    id: '3',
    preview: 'Rewrite this paragraph to sound more concise.',
    title: 'Copy editing help',
    updatedAt: 'Mon',
  },
];

function DefaultDemo() {
  return (
    <div className='w-[480px]'>
      <ChatListView aria-label='Recent chats' items={chats}>
        {(chat) => (
          <ChatListView.Item
            id={chat.id}
            textValue={`${chat.title} ${chat.preview}`}
          >
            <ChatListView.ItemContent>
              <ChatListView.Icon>
                <HugeiconsIcon icon={Comment01Icon} />
              </ChatListView.Icon>
              <ChatListView.Text>
                <ChatListView.Title>{chat.title}</ChatListView.Title>
                <ChatListView.Preview>{chat.preview}</ChatListView.Preview>
              </ChatListView.Text>
              <ChatListView.Meta>{chat.updatedAt}</ChatListView.Meta>
            </ChatListView.ItemContent>
          </ChatListView.Item>
        )}
      </ChatListView>
    </div>
  );
}

function CompactDemo() {
  return (
    <div className='w-[280px]'>
      <ChatListView aria-label='Recent chats' density='compact' items={chats}>
        {(chat) => (
          <ChatListView.Item id={chat.id} textValue={chat.title}>
            <ChatListView.ItemContent>
              <ChatListView.Icon>
                <HugeiconsIcon icon={Comment01Icon} />
              </ChatListView.Icon>
              <ChatListView.Text>
                <ChatListView.Title>{chat.title}</ChatListView.Title>
                <ChatListView.Preview>{chat.preview}</ChatListView.Preview>
              </ChatListView.Text>
              <ChatListView.Meta>{chat.updatedAt}</ChatListView.Meta>
            </ChatListView.ItemContent>
          </ChatListView.Item>
        )}
      </ChatListView>
    </div>
  );
}

export const Default: Story = { render: () => <DefaultDemo /> };
export const Compact: Story = { render: () => <CompactDemo /> };
