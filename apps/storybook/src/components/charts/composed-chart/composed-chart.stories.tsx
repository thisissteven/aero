import type { Meta, StoryObj } from '@storybook/react';

import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { Card } from '@/components/layout/card';

import { ComposedChart } from './index';

const meta = {
  component: ComposedChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Charts/ComposedChart',
} satisfies Meta<typeof ComposedChart>;
export default meta;
type Story = StoryObj<any>;

function Legend({
  items,
}: {
  items: ReadonlyArray<{ color: string; label: string }>;
}) {
  return (
    <div className='flex items-center gap-3'>
      {items.map(({ color, label }) => (
        <div className='flex items-center gap-1.5' key={label}>
          <span
            className='size-3 rounded-full'
            style={{ backgroundColor: color }}
          />
          <span className='text-muted text-xs'>{label}</span>
        </div>
      ))}
    </div>
  );
}

function Axes({ dual = false }: { dual?: boolean }) {
  return (
    <>
      <ComposedChart.Grid vertical={false} />
      <ComposedChart.XAxis dataKey='month' tickMargin={8} />
      <ComposedChart.YAxis
        tickFormatter={(value: number) =>
          value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
        }
        width={dual ? 35 : 30}
        {...(dual ? { yAxisId: 'left' } : {})}
      />
      {dual ? (
        <ComposedChart.YAxis
          domain={[0, 60]}
          orientation='right'
          tickFormatter={(value: number) => `${value}%`}
          width={35}
          yAxisId='right'
        />
      ) : null}
    </>
  );
}

const defaultData = [
  { month: 'Jan', orders: 320, revenue: 4200 },
  { month: 'Feb', orders: 450, revenue: 5800 },
  { month: 'Mar', orders: 380, revenue: 4900 },
  { month: 'Apr', orders: 520, revenue: 7200 },
  { month: 'May', orders: 480, revenue: 6100 },
  { month: 'Jun', orders: 600, revenue: 8400 },
  { month: 'Jul', orders: 550, revenue: 7800 },
  { month: 'Aug', orders: 680, revenue: 9200 },
  { month: 'Sep', orders: 620, revenue: 8600 },
  { month: 'Oct', orders: 750, revenue: 10200 },
  { month: 'Nov', orders: 700, revenue: 9800 },
  { month: 'Dec', orders: 820, revenue: 11500 },
];

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Bar + Line on dual Y-axes — revenue bars with an orders trend line overlay.',
      },
    },
  },
  render: () => (
    <Card className='w-full rounded-2xl'>
      <Card.Header>
        <Card.Title className='text-base'>Revenue & Orders</Card.Title>
        <Legend
          items={[
            { color: 'var(--chart-3)', label: 'Revenue' },
            { color: 'var(--chart-1)', label: 'Orders' },
          ]}
        />
      </Card.Header>
      <Card.Content>
        <ComposedChart data={defaultData} height={260}>
          <ComposedChart.Grid vertical={false} />
          <ComposedChart.XAxis dataKey='month' tickMargin={8} />
          <ComposedChart.YAxis
            tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
            width={40}
            yAxisId='left'
          />
          <ComposedChart.YAxis orientation='right' width={40} yAxisId='right' />
          <ComposedChart.Bar
            barSize={16}
            dataKey='revenue'
            fill='var(--chart-3)'
            name='Revenue'
            radius={[4, 4, 0, 0]}
            yAxisId='left'
          />
          <ComposedChart.Line
            dataKey='orders'
            dot={false}
            name='Orders'
            stroke='var(--chart-1)'
            strokeWidth={2}
            type='monotone'
            yAxisId='right'
          />
          <ComposedChart.Tooltip
            content={({ active, label, payload }) =>
              !active || !payload?.length ? null : (
                <ChartTooltip>
                  <ChartTooltip.Header>{label}</ChartTooltip.Header>
                  {payload.map((entry) => (
                    <ChartTooltip.Item key={String(entry.dataKey)}>
                      <ChartTooltip.Indicator
                        color={entry.color ?? entry.fill ?? entry.stroke}
                      />
                      <ChartTooltip.Label>{entry.name}</ChartTooltip.Label>
                      <ChartTooltip.Value>
                        {entry.dataKey === 'revenue'
                          ? `$${Number(entry.value).toLocaleString()}`
                          : Number(entry.value).toLocaleString()}
                      </ChartTooltip.Value>
                    </ChartTooltip.Item>
                  ))}
                </ChartTooltip>
              )
            }
          />
        </ComposedChart>
      </Card.Content>
    </Card>
  ),
};

const codeData = [
  {
    aiPct: 72,
    cli: 800,
    cloudAgent: 200,
    day: 'Mar 13',
    ide: 2200,
    other: 100,
  },
  { aiPct: 65, cli: 500, cloudAgent: 100, day: 'Mar 14', ide: 1200, other: 80 },
  { aiPct: 78, cli: 400, cloudAgent: 150, day: 'Mar 15', ide: 3200, other: 50 },
  {
    aiPct: 88,
    cli: 1200,
    cloudAgent: 300,
    day: 'Mar 16',
    ide: 13500,
    other: 200,
  },
  {
    aiPct: 85,
    cli: 1000,
    cloudAgent: 250,
    day: 'Mar 17',
    ide: 13200,
    other: 180,
  },
  { aiPct: 60, cli: 200, cloudAgent: 50, day: 'Mar 18', ide: 800, other: 30 },
  { aiPct: 55, cli: 150, cloudAgent: 40, day: 'Mar 19', ide: 600, other: 20 },
  { aiPct: 50, cli: 100, cloudAgent: 30, day: 'Mar 22', ide: 400, other: 15 },
  { aiPct: 48, cli: 80, cloudAgent: 20, day: 'Mar 25', ide: 300, other: 10 },
  {
    aiPct: 70,
    cli: 600,
    cloudAgent: 200,
    day: 'Mar 28',
    ide: 5000,
    other: 100,
  },
  {
    aiPct: 75,
    cli: 800,
    cloudAgent: 250,
    day: 'Mar 31',
    ide: 8500,
    other: 150,
  },
  { aiPct: 68, cli: 500, cloudAgent: 150, day: 'Apr 3', ide: 3000, other: 80 },
  {
    aiPct: 82,
    cli: 900,
    cloudAgent: 300,
    day: 'Apr 6',
    ide: 10500,
    other: 200,
  },
  {
    aiPct: 90,
    cli: 1500,
    cloudAgent: 500,
    day: 'Apr 7',
    ide: 23000,
    other: 300,
  },
  {
    aiPct: 85,
    cli: 1200,
    cloudAgent: 400,
    day: 'Apr 9',
    ide: 18000,
    other: 250,
  },
];

export const StackedBarWithLine: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Stacked bars + line overlay — inspired by the GitHub AI code share dashboard. Multiple bar series stacked with a percentage line on a secondary Y-axis.',
      },
    },
  },
  render: function Story() {
    const bars = [
      { color: 'var(--chart-4)', key: 'ide', label: 'IDE' },
      { color: 'var(--chart-2)', key: 'cli', label: 'CLI' },
      { color: 'var(--chart-3)', key: 'cloudAgent', label: 'Cloud Agent' },
      { color: 'var(--chart-1)', key: 'other', label: 'Other' },
    ] as const;
    return (
      <Card className='w-full max-w-[700px] rounded-2xl'>
        <Card.Header className='flex-row items-center justify-between'>
          <Card.Title className='text-base'>
            AI Share of Committed Code
          </Card.Title>
          <Legend items={[...bars, { color: 'var(--muted)', label: 'AI %' }]} />
        </Card.Header>
        <Card.Content>
          <ComposedChart data={codeData} height={300}>
            <ComposedChart.Grid vertical={false} />
            <ComposedChart.XAxis dataKey='day' tickMargin={8} />
            <ComposedChart.YAxis
              tickFormatter={(value: number) =>
                value >= 1000 ? `${(value / 1000).toFixed(0)}K` : `${value}`
              }
              width={35}
              yAxisId='left'
            />
            <ComposedChart.YAxis
              domain={[0, 100]}
              orientation='right'
              tickFormatter={(value: number) => `${value}%`}
              width={40}
              yAxisId='right'
            />
            {bars.map((bar, index) => (
              <ComposedChart.Bar
                barSize={index === 0 ? 20 : undefined}
                dataKey={bar.key}
                fill={bar.color}
                key={bar.key}
                name={bar.label}
                radius={index === bars.length - 1 ? [4, 4, 0, 0] : undefined}
                stackId='code'
                yAxisId='left'
              />
            ))}
            <ComposedChart.Line
              dataKey='aiPct'
              dot={false}
              name='AI %'
              stroke='var(--muted)'
              strokeWidth={1.5}
              type='monotone'
              yAxisId='right'
            />
            <ComposedChart.Tooltip
              content={<ComposedChart.TooltipContent indicator='line' />}
            />
          </ComposedChart>
        </Card.Content>
      </Card>
    );
  },
};

const sessions = defaultData.map((item, index) => ({
  month: item.month,
  sessions:
    [
      12000, 18000, 15000, 22000, 19000, 25000, 23000, 28000, 26000, 31000,
      29000, 34000,
    ][index] ?? 0,
  target:
    [
      15000, 16000, 17000, 18000, 19000, 20000, 21000, 22000, 23000, 24000,
      25000, 26000,
    ][index] ?? 0,
}));

export const AreaWithLine: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Area + dashed line — filled area for actual sessions with a dashed target line.',
      },
    },
  },
  render: () => (
    <Card className='w-full max-w-[560px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Sessions vs Target</Card.Title>
        <Legend
          items={[
            { color: 'var(--chart-3)', label: 'Sessions' },
            { color: 'var(--chart-1)', label: 'Target' },
          ]}
        />
      </Card.Header>
      <Card.Content>
        <ComposedChart data={sessions} height={260}>
          <defs>
            <linearGradient id='sessions-gradient' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0%' stopColor='var(--chart-3)' stopOpacity={0.2} />
              <stop
                offset='100%'
                stopColor='var(--chart-3)'
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <Axes />
          <ComposedChart.Area
            dataKey='sessions'
            dot={false}
            fill='url(#sessions-gradient)'
            name='Sessions'
            stroke='var(--chart-3)'
            strokeWidth={2}
            type='monotone'
          />
          <ComposedChart.Line
            dataKey='target'
            dot={false}
            name='Target'
            stroke='var(--chart-1)'
            strokeDasharray='6 3'
            strokeWidth={2}
            type='monotone'
          />
          <ComposedChart.Tooltip content={<ComposedChart.TooltipContent />} />
        </ComposedChart>
      </Card.Content>
    </Card>
  ),
};

const impressions = defaultData.map((item, index) => ({
  ctr: [3.2, 3.8, 3.5, 4.2, 4, 4.8, 4.5, 5.1, 4.9, 5.5, 5.2, 5.8][index] ?? 0,
  impressions:
    [
      45000, 52000, 48000, 61000, 58000, 72000, 68000, 78000, 75000, 85000,
      82000, 92000,
    ][index] ?? 0,
  month: item.month,
}));

export const BarWithArea: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Bar + Area — impressions bars with a CTR area on a secondary axis.',
      },
    },
  },
  render: () => (
    <Card className='w-full max-w-[560px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Impressions & CTR</Card.Title>
        <Legend
          items={[
            { color: 'var(--chart-3)', label: 'Impressions' },
            { color: 'var(--chart-4)', label: 'CTR %' },
          ]}
        />
      </Card.Header>
      <Card.Content>
        <ComposedChart data={impressions} height={260}>
          <defs>
            <linearGradient id='ctr-gradient' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0%' stopColor='var(--chart-4)' stopOpacity={0.15} />
              <stop
                offset='100%'
                stopColor='var(--chart-4)'
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <ComposedChart.Grid vertical={false} />
          <ComposedChart.XAxis dataKey='month' tickMargin={8} />
          <ComposedChart.YAxis
            tickFormatter={(value: number) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
            }
            width={35}
            yAxisId='left'
          />
          <ComposedChart.YAxis
            domain={[0, 8]}
            orientation='right'
            tickFormatter={(value: number) => `${value}%`}
            width={35}
            yAxisId='right'
          />
          <ComposedChart.Area
            dataKey='ctr'
            dot={false}
            fill='url(#ctr-gradient)'
            name='CTR'
            stroke='none'
            type='monotone'
            yAxisId='right'
          />
          <ComposedChart.Bar
            barSize={16}
            dataKey='impressions'
            fill='var(--chart-3)'
            name='Impressions'
            radius={[4, 4, 0, 0]}
            yAxisId='left'
          />
          <ComposedChart.Line
            dataKey='ctr'
            dot={false}
            legendType='none'
            stroke='var(--chart-4)'
            strokeWidth={2}
            tooltipType='none'
            type='monotone'
            yAxisId='right'
          />
          <ComposedChart.Tooltip content={<ComposedChart.TooltipContent />} />
        </ComposedChart>
      </Card.Content>
    </Card>
  ),
};

const analytics = defaultData.map((item, index) => ({
  bounceRate: [42, 38, 40, 35, 37, 32, 34, 30, 31, 28, 29, 26][index] ?? 0,
  month: item.month,
  pageViews:
    [
      8200, 11500, 9800, 14200, 12100, 16800, 15200, 18400, 17200, 20500, 19600,
      23000,
    ][index] ?? 0,
  users:
    [3200, 4500, 3800, 5600, 4800, 6600, 6000, 7200, 6800, 8100, 7700, 9100][
      index
    ] ?? 0,
}));

export const MultiType: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'All three types combined — Area for page views, Bar for users, Line for bounce rate. Demonstrates the full power of ComposedChart with dual Y-axes.',
      },
    },
  },
  render: () => (
    <Card className='w-full max-w-[620px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Site Analytics</Card.Title>
        <Legend
          items={[
            { color: 'var(--chart-3)', label: 'Page Views' },
            { color: 'var(--chart-4)', label: 'Users' },
            { color: 'var(--chart-1)', label: 'Bounce Rate' },
          ]}
        />
      </Card.Header>
      <Card.Content>
        <ComposedChart data={analytics} height={280}>
          <defs>
            <linearGradient id='pv-gradient' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0%' stopColor='var(--chart-3)' stopOpacity={0.15} />
              <stop
                offset='100%'
                stopColor='var(--chart-3)'
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <Axes dual />
          <ComposedChart.Area
            dataKey='pageViews'
            dot={false}
            fill='url(#pv-gradient)'
            name='Page Views'
            stroke='var(--chart-3)'
            strokeWidth={2}
            type='monotone'
            yAxisId='left'
          />
          <ComposedChart.Bar
            barSize={14}
            dataKey='users'
            fill='var(--chart-4)'
            name='Users'
            radius={[4, 4, 0, 0]}
            yAxisId='left'
          />
          <ComposedChart.Line
            dataKey='bounceRate'
            dot={{ fill: 'var(--chart-1)', r: 3, strokeWidth: 0 }}
            name='Bounce Rate'
            stroke='var(--chart-1)'
            strokeWidth={2}
            type='monotone'
            yAxisId='right'
          />
          <ComposedChart.Tooltip
            content={<ComposedChart.TooltipContent indicator='line' />}
          />
        </ComposedChart>
      </Card.Content>
    </Card>
  ),
};
