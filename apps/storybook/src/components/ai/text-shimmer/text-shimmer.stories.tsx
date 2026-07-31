import type { Meta, StoryObj } from '@storybook/react';

import { TextShimmer } from './index';

const meta = {
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/AI/TextShimmer',
} satisfies Meta<typeof TextShimmer>;
export default meta;
type Story = StoryObj<typeof meta>;
export const Default: Story = {
  render: () => (
    <div className='flex flex-col gap-4 text-sm'>
      <TextShimmer>Thinking...</TextShimmer>
      <TextShimmer>Generating response...</TextShimmer>
    </div>
  ),
};
