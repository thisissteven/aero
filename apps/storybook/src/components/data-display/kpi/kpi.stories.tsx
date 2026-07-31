import type { Meta, StoryObj } from '@storybook/react';

import { Link } from '@aero/ui/link';
import { NumberValue } from '@aero/ui/number-value';
import { TrendChip } from '@aero/ui/trend-chip';

import { Icon } from '@/icon';

import { KPI } from './index';

const meta = {
  component: KPI,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Data Display/KPI (Key Performance Indicator)',
} satisfies Meta<typeof KPI>;
export default meta;
type Story = StoryObj<typeof meta>;
const up = [
  { value: 30 },
  { value: 35 },
  { value: 28 },
  { value: 42 },
  { value: 38 },
  { value: 45 },
  { value: 50 },
  { value: 48 },
  { value: 55 },
  { value: 60 },
  { value: 58 },
  { value: 65 },
];
const down = [
  { value: 65 },
  { value: 60 },
  { value: 62 },
  { value: 55 },
  { value: 58 },
  { value: 52 },
  { value: 50 },
  { value: 48 },
  { value: 45 },
  { value: 42 },
  { value: 44 },
  { value: 40 },
];
const cards = [
  { change: '+33%', title: 'Total Revenue', trend: 'up', value: 228451 },
  { change: '+13.0%', title: 'Total Expenses', trend: 'down', value: 71887 },
  { change: '0.0%', title: 'Total Profit', trend: 'neutral', value: 156540 },
  { change: '+1.0%', title: 'New Customers', trend: 'up', value: 1234 },
] as const;

export const Default: Story = {
  render: () => (
    <div className='grid w-[900px] grid-cols-1 gap-3 rounded-2xl p-6 sm:grid-cols-2 lg:grid-cols-4'>
      {cards.map((card) => (
        <KPI key={card.title}>
          <KPI.Header>
            <KPI.Title>{card.title}</KPI.Title>
          </KPI.Header>
          <KPI.Content>
            <KPI.Value
              currency={card.title.includes('Customer') ? undefined : 'USD'}
              maximumFractionDigits={0}
              style={card.title.includes('Customer') ? 'decimal' : 'currency'}
              value={card.value}
            />
            <KPI.Trend trend={card.trend}>{card.change}</KPI.Trend>
          </KPI.Content>
        </KPI>
      ))}
    </div>
  ),
};
export const WithIcon: Story = {
  render: () => (
    <div className='grid w-[900px] grid-cols-1 gap-3 rounded-2xl p-6 sm:grid-cols-2 lg:grid-cols-3'>
      {[
        {
          title: 'Total Users',
          value: 5400,
          change: '+33%',
          trend: 'up',
          status: 'success',
          icon: 'solar:user-plus-linear',
        },
        {
          title: 'Total Sales',
          value: 15400,
          change: '0.0%',
          trend: 'neutral',
          status: 'warning',
          icon: 'solar:dollar-minimalistic-linear',
        },
        {
          title: 'Net Profit',
          value: 10400,
          change: '-3.3%',
          trend: 'down',
          status: 'danger',
          icon: 'solar:tag-price-linear',
        },
      ].map((card) => (
        <KPI key={card.title}>
          <KPI.Header>
            <KPI.Icon status={card.status as 'danger' | 'success' | 'warning'}>
              <Icon icon={card.icon} />
            </KPI.Icon>
            <KPI.Title>{card.title}</KPI.Title>
          </KPI.Header>
          <KPI.Content>
            <KPI.Value
              {...(card.title !== 'Total Users'
                ? { currency: 'USD', style: 'currency' as const }
                : {})}
              maximumFractionDigits={0}
              value={card.value}
            />
            <KPI.Trend trend={card.trend as 'down' | 'neutral' | 'up'}>
              {card.change}
            </KPI.Trend>
          </KPI.Content>
        </KPI>
      ))}
    </div>
  ),
};
export const WithProgress: Story = {
  render: () => (
    <div className='grid w-[900px] grid-cols-1 gap-3 rounded-2xl p-6 sm:grid-cols-2 lg:grid-cols-3'>
      {[
        { title: 'Server Load', value: 0.38, progress: 38, status: 'success' },
        { title: 'Server Load', value: 0.98, progress: 98, status: 'danger' },
        {
          title: 'Average Memory Used',
          value: 0.64,
          progress: 64,
          status: 'warning',
        },
      ].map((card, index) => (
        <KPI key={`${card.title}-${index}`}>
          <KPI.Header>
            <KPI.Icon status={card.status as 'danger' | 'success' | 'warning'}>
              <Icon icon='solar:server-square-linear' />
            </KPI.Icon>
            <KPI.Title>{card.title}</KPI.Title>
          </KPI.Header>
          <KPI.Content>
            <KPI.Value
              maximumFractionDigits={0}
              style='percent'
              value={card.value}
            />
            <KPI.Progress
              status={card.status as 'danger' | 'success' | 'warning'}
              value={card.progress}
            />
          </KPI.Content>
        </KPI>
      ))}
    </div>
  ),
};
export const WithActions: Story = {
  render: () => (
    <div className='grid w-[900px] grid-cols-1 gap-3 rounded-2xl p-6 sm:grid-cols-2 lg:grid-cols-3'>
      {[
        {
          title: 'Conversion Rate',
          value: 0.038,
          trend: '+1.7%',
          status: 'success',
        },
        {
          title: 'Bounce Rate',
          value: 0.423,
          trend: '-5.9%',
          status: 'danger',
        },
        { title: 'Load Time', value: 856, trend: null, status: 'warning' },
      ].map((card) => (
        <KPI key={card.title}>
          <KPI.Header>
            <KPI.Icon status={card.status as 'danger' | 'success' | 'warning'}>
              <Icon icon='solar:target-linear' />
            </KPI.Icon>
            <KPI.Title>{card.title}</KPI.Title>
          </KPI.Header>
          <KPI.Actions aria-label={`${card.title} actions`} />
          <KPI.Content>
            <KPI.Value
              maximumFractionDigits={1}
              {...(card.title !== 'Load Time'
                ? { style: 'percent' as const }
                : {})}
              value={card.value}
            >
              {card.title === 'Load Time' ? (
                <NumberValue.Suffix>ms</NumberValue.Suffix>
              ) : undefined}
            </KPI.Value>
            {card.trend ? (
              <KPI.Trend trend={card.status === 'danger' ? 'down' : 'up'}>
                {card.trend}
              </KPI.Trend>
            ) : (
              <KPI.Progress status='warning' value={56} />
            )}
          </KPI.Content>
        </KPI>
      ))}
    </div>
  ),
};
export const WithFooter: Story = {
  render: () => (
    <div className='grid w-[900px] grid-cols-1 gap-3 rounded-2xl p-6 sm:grid-cols-2'>
      {[
        {
          title: 'Total Subscribers',
          value: 71897,
          change: '+122',
          status: 'success',
          href: 'View all',
        },
        {
          title: 'Monthly Revenue',
          value: 45231,
          change: '+20.1%',
          status: 'warning',
          href: 'View report',
        },
      ].map((card) => (
        <KPI key={card.title}>
          <KPI.Header>
            <KPI.Icon status={card.status as 'success' | 'warning'}>
              <Icon icon='solar:users-group-rounded-linear' />
            </KPI.Icon>
            <KPI.Title>{card.title}</KPI.Title>
            <KPI.Trend className='ml-auto' trend='up'>
              {card.change}
            </KPI.Trend>
          </KPI.Header>
          <KPI.Content>
            <KPI.Value
              {...(card.title.includes('Revenue')
                ? { currency: 'USD', style: 'currency' as const }
                : {})}
              maximumFractionDigits={0}
              value={card.value}
            />
          </KPI.Content>
          <KPI.Footer>
            <Link className='text-sm' href='#'>
              {card.href}
            </Link>
          </KPI.Footer>
        </KPI>
      ))}
    </div>
  ),
};
export const WithChartBottom: Story = {
  render: () => (
    <div className='grid w-[900px] grid-cols-1 gap-3 rounded-2xl p-6 sm:grid-cols-2 lg:grid-cols-3'>
      <KPI>
        <KPI.Header>
          <KPI.Title>Total Revenue</KPI.Title>
        </KPI.Header>
        <KPI.Content>
          <KPI.Value
            currency='USD'
            maximumFractionDigits={0}
            style='currency'
            value={228451}
          />
          <KPI.Trend trend='up'>+3.3%</KPI.Trend>
        </KPI.Content>
        <KPI.Chart color='var(--color-success)' data={up} />
      </KPI>
      <KPI>
        <KPI.Header>
          <KPI.Title>Baer Limited (BAL)</KPI.Title>
        </KPI.Header>
        <KPI.Content>
          <KPI.Value currency='USD' style='currency' value={49.33} />
          <KPI.Trend trend='down'>-1.9%</KPI.Trend>
        </KPI.Content>
        <KPI.Chart color='var(--color-danger)' data={down} />
      </KPI>
      <KPI>
        <KPI.Header>
          <KPI.Icon status='success'>
            <Icon icon='solar:users-group-rounded-linear' />
          </KPI.Icon>
          <KPI.Title>Active Users</KPI.Title>
        </KPI.Header>
        <KPI.Actions aria-label='Active Users actions' />
        <KPI.Content>
          <KPI.Value
            maximumFractionDigits={0}
            notation='compact'
            value={97859}
          />
          <KPI.Trend trend='neutral'>10.9%</KPI.Trend>
        </KPI.Content>
        <KPI.Chart color='var(--color-accent)' data={up} height={60} />
      </KPI>
    </div>
  ),
};
export const WithChartInline: Story = {
  render: () => (
    <div className='grid w-[900px] grid-cols-1 gap-3 rounded-2xl p-6 sm:grid-cols-2'>
      {[
        {
          title: 'Total Clicks',
          value: 2441,
          trend: 'up',
          change: '3.5%',
          suffix: 'last 30d',
          data: up,
          color: 'var(--color-accent)',
        },
        {
          title: 'Bounce Rate',
          value: 0.423,
          trend: 'down',
          change: '5.9%',
          suffix: 'vs last 7d',
          data: down,
          color: 'var(--color-danger)',
        },
      ].map((card) => (
        <KPI key={card.title}>
          <KPI.Header>
            <Icon className='text-muted size-4' icon='solar:target-linear' />
            <KPI.Title>{card.title}</KPI.Title>
          </KPI.Header>
          <KPI.Content className='grid-cols-[1fr_1fr] items-end'>
            <div className='flex flex-col gap-1'>
              <KPI.Value
                className='text-3xl'
                maximumFractionDigits={card.title === 'Bounce Rate' ? 1 : 0}
                {...(card.title === 'Bounce Rate'
                  ? { style: 'percent' as const }
                  : {})}
                value={card.value}
              />
              <div className='flex items-center gap-1.5'>
                <TrendChip
                  trend={card.trend as 'down' | 'up'}
                  variant='tertiary'
                >
                  {card.change}
                  <TrendChip.Suffix>{card.suffix}</TrendChip.Suffix>
                </TrendChip>
              </div>
            </div>
            <KPI.Chart
              color={card.color}
              data={card.data}
              height={70}
              strokeWidth={1.5}
            />
          </KPI.Content>
        </KPI>
      ))}
    </div>
  ),
};
