import type { Meta, StoryObj } from '@storybook/react';

import { Icon } from '@/icon';

import { TrendChip } from './index';

const meta = {
  component: TrendChip,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Data Display/TrendChip',
} satisfies Meta<typeof TrendChip>;
export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  render: () => (
    <div className='flex items-center gap-3 rounded-2xl p-6'>
      <TrendChip trend='up'>+3.3%</TrendChip>
      <TrendChip trend='down'>-2.1%</TrendChip>
      <TrendChip trend='neutral'>0.0%</TrendChip>
    </div>
  ),
};

export const Variants: Story = {
  render: () => (
    <div className='flex flex-col gap-3 rounded-2xl p-6'>
      {(['primary', 'secondary', 'tertiary', 'soft'] as const).map(
        (variant) => (
          <div className='flex items-center gap-3' key={variant}>
            <span className='text-muted w-20 text-xs'>{variant}</span>
            <TrendChip trend='up' variant={variant}>
              +3.3%
            </TrendChip>
            <TrendChip trend='down' variant={variant}>
              -2.1%
            </TrendChip>
            <TrendChip trend='neutral' variant={variant}>
              0.0%
            </TrendChip>
          </div>
        ),
      )}
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className='flex items-center gap-3 rounded-2xl p-6'>
      {(['sm', 'md', 'lg'] as const).map((size) => (
        <TrendChip key={size} size={size} trend='up'>
          +3.3%
        </TrendChip>
      ))}
    </div>
  ),
};

export const CustomIndicator: Story = {
  render: () => (
    <div className='flex items-center gap-3 rounded-2xl p-6'>
      <TrendChip trend='up'>
        <TrendChip.Indicator>
          <Icon icon='solar:arrow-up-linear' />
        </TrendChip.Indicator>
        +3.3%
      </TrendChip>
      <TrendChip trend='down'>
        <TrendChip.Indicator>
          <Icon icon='solar:arrow-down-linear' />
        </TrendChip.Indicator>
        -2.1%
      </TrendChip>
      <TrendChip trend='up'>
        <TrendChip.Indicator>
          <Icon icon='solar:fire-linear' />
        </TrendChip.Indicator>
        +12.5%
      </TrendChip>
      <TrendChip trend='neutral'>
        <TrendChip.Indicator>
          <Icon icon='solar:bolt-linear' />
        </TrendChip.Indicator>
        0.0%
      </TrendChip>
    </div>
  ),
};

export const PrefixAndSuffix: Story = {
  render: () => (
    <div className='flex flex-col items-start gap-3 rounded-2xl p-6'>
      <TrendChip trend='up'>
        <TrendChip.Prefix>+$</TrendChip.Prefix>1,234
      </TrendChip>
      <TrendChip trend='down'>
        -5.9%<TrendChip.Suffix>vs last month</TrendChip.Suffix>
      </TrendChip>
      <TrendChip trend='up'>
        <TrendChip.Prefix>+</TrendChip.Prefix>3.3%
        <TrendChip.Suffix>MoM</TrendChip.Suffix>
      </TrendChip>
    </div>
  ),
};

export const TabularNums: Story = {
  render: () => (
    <div className='flex flex-col items-start gap-2 rounded-2xl p-6'>
      <TrendChip trend='up'>+1.1%</TrendChip>
      <TrendChip trend='up'>+22.2%</TrendChip>
      <TrendChip trend='down'>-333.3%</TrendChip>
      <TrendChip trend='neutral'>0.0%</TrendChip>
    </div>
  ),
};
