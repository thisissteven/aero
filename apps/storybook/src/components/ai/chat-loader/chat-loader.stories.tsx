import type { Meta, StoryObj } from '@storybook/react';

import { ChatLoader } from './index';
const meta = {
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/AI/ChatLoader',
} satisfies Meta;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  render: () => (
    <div className='flex w-[420px] flex-col gap-8'>
      <div className='flex items-center gap-3'>
        <span className='text-muted text-sm'>Dots</span>
        <ChatLoader.Dots />
      </div>
      <div className='flex items-center gap-3'>
        <span className='text-muted text-sm'>Pulse</span>
        <ChatLoader.Pulse />
      </div>
      <div className='flex items-center gap-3'>
        <span className='text-muted text-sm'>Spinner</span>
        <ChatLoader.Spinner />
      </div>
      <ChatLoader.Skeleton />
    </div>
  ),
};
