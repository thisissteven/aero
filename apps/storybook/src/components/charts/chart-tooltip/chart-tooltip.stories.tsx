import type { Meta, StoryObj } from '@storybook/react';

import { ChartTooltip } from './index';

const meta: Meta<typeof ChartTooltip> = {
  component: ChartTooltip,
  tags: ['autodocs'],
  title: 'Components/Charts/ChartTooltip',
};

export default meta;
type Story = StoryObj<any>;

export const Default: Story = {
  parameters: {
    docs: { description: { story: 'Static tooltip with dot indicators.' } },
  },
  render: () => (
    <ChartTooltip>
      <ChartTooltip.Header>January</ChartTooltip.Header>
      <ChartTooltip.Item>
        <ChartTooltip.Indicator color='var(--chart-3)' />
        <ChartTooltip.Label>Revenue</ChartTooltip.Label>
        <ChartTooltip.Value>$12,400</ChartTooltip.Value>
      </ChartTooltip.Item>
      <ChartTooltip.Item>
        <ChartTooltip.Indicator color='var(--chart-1)' />
        <ChartTooltip.Label>Expenses</ChartTooltip.Label>
        <ChartTooltip.Value>$8,200</ChartTooltip.Value>
      </ChartTooltip.Item>
    </ChartTooltip>
  ),
};

export const LineIndicator: Story = {
  parameters: {
    docs: { description: { story: 'Line indicator variant.' } },
  },
  render: () => (
    <ChartTooltip indicator='line'>
      <ChartTooltip.Header>March 2025</ChartTooltip.Header>
      {[
        ['Organic', '15,200', 'var(--chart-3)'],
        ['Paid Ads', '8,400', 'var(--chart-2)'],
        ['Referral', '3,100', 'var(--chart-1)'],
      ].map(([label, value, color]) => (
        <ChartTooltip.Item key={label}>
          <ChartTooltip.Indicator color={color} />
          <ChartTooltip.Label>{label}</ChartTooltip.Label>
          <ChartTooltip.Value>{value}</ChartTooltip.Value>
        </ChartTooltip.Item>
      ))}
    </ChartTooltip>
  ),
};

export const NoHeader: Story = {
  parameters: { docs: { description: { story: 'Without header.' } } },
  render: () => (
    <ChartTooltip>
      <ChartTooltip.Item>
        <ChartTooltip.Indicator color='var(--chart-3)' />
        <ChartTooltip.Label>Sales</ChartTooltip.Label>
        <ChartTooltip.Value>458</ChartTooltip.Value>
      </ChartTooltip.Item>
    </ChartTooltip>
  ),
};

const chartColors = [
  ['chart-1', 'Lightest'],
  ['chart-2', 'Light'],
  ['chart-3', 'Accent'],
  ['chart-4', 'Darkest'],
] as const;

function ColorTooltip({ indicator = 'dot' }: { indicator?: 'dot' | 'line' }) {
  return (
    <ChartTooltip indicator={indicator}>
      <ChartTooltip.Header>
        {indicator === 'line' ? 'Line Indicators' : 'All Chart Colors'}
      </ChartTooltip.Header>
      {chartColors.map(([token, label]) => (
        <ChartTooltip.Item key={token}>
          <ChartTooltip.Indicator color={`var(--${token})`} />
          <ChartTooltip.Label>{token}</ChartTooltip.Label>
          <ChartTooltip.Value>{label}</ChartTooltip.Value>
        </ChartTooltip.Item>
      ))}
    </ChartTooltip>
  );
}

export const ChartColors: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Using chart color variables (chart-1 through chart-4).',
      },
    },
  },
  render: () => (
    <div className='flex gap-6'>
      <ColorTooltip />
      <ColorTooltip indicator='line' />
    </div>
  ),
};

export const AutoContent: Story = {
  parameters: {
    docs: {
      description: {
        story: 'ChartTooltip.Content auto-renders from Recharts-style payload.',
      },
    },
  },
  render: () => (
    <div className='flex gap-6'>
      <ChartTooltip.Content
        active
        label='February'
        payload={[
          { color: 'var(--chart-3)', name: 'Revenue', value: 18200 },
          { color: 'var(--chart-1)', name: 'Expenses', value: 9800 },
        ]}
      />
      <ChartTooltip.Content
        active
        indicator='line'
        label='Q1 2025'
        payload={[
          { name: 'Organic', stroke: 'var(--chart-3)', value: 22000 },
          { name: 'Paid Ads', stroke: 'var(--chart-2)', value: 14500 },
          { name: 'Referral', stroke: 'var(--chart-1)', value: 5200 },
        ]}
      />
    </div>
  ),
};

export const CustomFormatters: Story = {
  parameters: {
    docs: { description: { story: 'With custom formatters.' } },
  },
  render: () => (
    <ChartTooltip.Content
      active
      label='2025-01-15'
      labelFormatter={(label) =>
        new Date(String(label)).toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'long',
          year: 'numeric',
        })
      }
      payload={[
        { name: 'Portfolio', stroke: 'var(--chart-3)', value: 24801.32 },
        { name: 'Benchmark', stroke: 'var(--chart-2)', value: 21500 },
      ]}
      valueFormatter={(value) => `$${Number(value).toLocaleString()}`}
    />
  ),
};

export const Inactive: Story = {
  parameters: {
    docs: {
      description: { story: 'Inactive tooltip renders nothing.' },
    },
  },
  render: () => (
    <div className='flex flex-col gap-4'>
      <p className='text-muted text-sm'>
        The tooltip below is inactive (active=false) — nothing should render:
      </p>
      <div className='bg-default flex h-16 items-center justify-center rounded-lg'>
        <ChartTooltip.Content active={false}>
          <ChartTooltip.Header>This should not be visible</ChartTooltip.Header>
        </ChartTooltip.Content>
        <span className='text-muted text-xs'>(empty — tooltip hidden)</span>
      </div>
    </div>
  ),
};
