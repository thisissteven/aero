import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';

import { ArrowDown02Icon, ArrowUp02Icon, Icon } from '@aero/ui/icons';

import { Segment } from '@/components/buttons/segment';
import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { Chip } from '@/components/data-display/chip';
import { KPI } from '@/components/data-display/kpi';
import { TrendChip } from '@/components/data-display/trend-chip';
import { Card } from '@/components/layout/card';

import { LineChart } from './index';

const meta = {
  component: LineChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Charts/LineChart',
} satisfies Meta<typeof LineChart>;

export default meta;
type Story = StoryObj<any>;

const trafficData = [
  { month: 'Jan', organic: 2000, paidAds: 1000 },
  { month: 'Feb', organic: 15000, paidAds: 10000 },
  { month: 'Mar', organic: 8000, paidAds: 12000 },
  { month: 'Apr', organic: 14000, paidAds: 14000 },
  { month: 'May', organic: 15000, paidAds: 8000 },
  { month: 'Jun', organic: 8000, paidAds: 9000 },
  { month: 'Jul', organic: 18000, paidAds: 12000 },
  { month: 'Aug', organic: 18000, paidAds: 10000 },
  { month: 'Sep', organic: 20000, paidAds: 5000 },
  { month: 'Oct', organic: 17000, paidAds: 12000 },
  { month: 'Nov', organic: 22000, paidAds: 18000 },
  { month: 'Dec', organic: 15000, paidAds: 9000 },
];

const revenueData = [
  4200, 5800, 4900, 7200, 6100, 8400, 7800, 9200, 8600, 10200, 9800, 11500,
].map((revenue, index) => ({
  month:
    [
      'Jan',
      'Feb',
      'Mar',
      'Apr',
      'May',
      'Jun',
      'Jul',
      'Aug',
      'Sep',
      'Oct',
      'Nov',
      'Dec',
    ][index] ?? 'Unknown',
  revenue,
}));

const sparkUp = [30, 35, 28, 42, 38, 45, 50, 48, 55, 60, 58, 65].map(
  (value) => ({ value }),
);
const sparkDown = [65, 60, 62, 55, 58, 52, 50, 48, 45, 42, 44, 40].map(
  (value) => ({ value }),
);

function Legend({
  items,
}: {
  items: ReadonlyArray<{ color: string; dashed?: boolean; label: string }>;
}) {
  return (
    <div className='flex items-center gap-3'>
      {items.map(({ color, dashed, label }) => (
        <div className='flex items-center gap-1.5' key={label}>
          <span
            className={
              dashed
                ? 'h-0 w-3 border-t-2 border-dashed'
                : 'size-3 rounded-full'
            }
            style={dashed ? { borderColor: color } : { backgroundColor: color }}
          />
          <span className='text-muted text-xs'>{label}</span>
        </div>
      ))}
    </div>
  );
}

function TrafficAxes({ currency = false }: { currency?: boolean }) {
  return (
    <>
      <LineChart.Grid vertical={false} />
      <LineChart.XAxis dataKey='month' tickMargin={8} />
      <LineChart.YAxis
        tickFormatter={(value: number) =>
          currency
            ? `$${(value / 1000).toFixed(0)}k`
            : value >= 1000
              ? `${(value / 1000).toFixed(0)}k`
              : `${value}`
        }
        width={currency ? 40 : 30}
      />
    </>
  );
}

export const TrafficSource: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Traffic Source — mirrors the dashboard-demo LineChart. Two lines (organic + paid ads), grid, axes, legend indicators, and tooltip.',
      },
    },
  },
  render: () => (
    <Card className='w-[520px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Traffic Source</Card.Title>
        <Legend
          items={[
            { color: 'var(--chart-3)', label: 'Organic' },
            { color: 'var(--chart-1)', label: 'Paid Ads' },
          ]}
        />
      </Card.Header>
      <Card.Content className='flex flex-col gap-4'>
        <div className='flex flex-col'>
          <span className='text-foreground text-lg font-semibold'>231,856</span>
          <span className='text-muted text-xs'>Sessions</span>
        </div>
        <LineChart data={trafficData} height={180}>
          <LineChart.Grid vertical={false} />
          <LineChart.XAxis dataKey='month' tickMargin={8} />
          <LineChart.YAxis
            tickFormatter={(value: number) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
            }
            ticks={[0, 5000, 10000, 20000]}
            width={30}
          />
          <LineChart.Line
            dataKey='organic'
            dot={false}
            name='Organic'
            stroke='var(--chart-3)'
            strokeWidth={2}
            type='linear'
          />
          <LineChart.Line
            dataKey='paidAds'
            dot={false}
            name='Paid Ads'
            stroke='var(--chart-1)'
            strokeWidth={2}
            type='linear'
          />
          <LineChart.Tooltip content={<LineChart.TooltipContent />} />
        </LineChart>
      </Card.Content>
    </Card>
  ),
};

const portfolioRanges = {
  '1H': {
    balance: '$24,801.32',
    change: '$42.10 (0.17%)',
    data: [
      24759, 24820, 24690, 24780, 24650, 24730, 24860, 24710, 24840, 24770,
      24900, 24680, 24810, 24750, 24801,
    ],
  },
  '1D': {
    balance: '$24,801.32',
    change: '$312.55 (1.28%)',
    data: [
      24490, 24680, 24350, 24520, 24750, 24410, 24600, 24380, 24720, 24550,
      24830, 24460, 24690, 24580, 24801,
    ],
  },
  '1W': {
    balance: '$24,801.32',
    change: '$842.18 (3.51%)',
    data: [
      23960, 24100, 23850, 24200, 24050, 24350, 24500, 24400, 24650, 24801,
    ],
  },
  '1M': {
    balance: '$24,801.32',
    change: '$1,242.77 (5.32%)',
    data: [
      18000, 17500, 17800, 18200, 19000, 18500, 19200, 20500, 20000, 21000,
      20800, 22000, 21500, 22800, 24801,
    ],
  },
  '1Y': {
    balance: '$24,801.32',
    change: '$8,401.32 (51.2%)',
    data: [
      16400, 15200, 17100, 16800, 18500, 19200, 18000, 20100, 21500, 19800,
      22400, 23100, 21800, 24200, 24801,
    ],
  },
  ALL: {
    balance: '$24,801.32',
    change: '$19,801.32 (396%)',
    data: [
      5000, 6200, 5800, 7500, 9200, 8400, 11000, 12800, 14500, 13200, 16800,
      18500, 20100, 22400, 24801,
    ],
  },
} as const;

function PortfolioExample() {
  const [range, setRange] = React.useState<keyof typeof portfolioRanges>('1M');
  const current = portfolioRanges[range];

  return (
    <Card className='w-[520px] rounded-2xl'>
      <Card.Header className='flex-row items-start justify-between pb-0'>
        <div className='flex flex-col gap-3'>
          <Card.Title className='text-base'>Portfolio</Card.Title>
          <div className='flex flex-col gap-0.5'>
            <span className='text-muted text-xs'>Total balance</span>
            <span className='text-foreground text-2xl font-semibold'>
              {current.balance}
            </span>
            <span className='text-xs font-medium text-green-500'>
              {current.change}
            </span>
          </div>
        </div>
        <Segment
          defaultSelectedKey='1M'
          size='sm'
          onSelectionChange={(key) =>
            setRange(key as keyof typeof portfolioRanges)
          }
        >
          {(
            Object.keys(portfolioRanges) as Array<keyof typeof portfolioRanges>
          ).map((key) => (
            <Segment.Item id={key} key={key}>
              {key}
            </Segment.Item>
          ))}
        </Segment>
      </Card.Header>
      <Card.Content>
        <LineChart
          data={current.data.map((value) => ({ value }))}
          height={182}
          margin={{ bottom: 0, left: 0, right: 0, top: 4 }}
        >
          <LineChart.YAxis domain={['dataMin - 1000', 'dataMax + 1000']} hide />
          <LineChart.Line
            dataKey='value'
            dot={false}
            stroke='var(--chart-3)'
            strokeWidth={2}
            type='monotone'
          />
        </LineChart>
      </Card.Content>
    </Card>
  );
}

export const Portfolio: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Portfolio — mirrors the finances-demo chart. Uses Segment for interactive time range switching with different data per range.',
      },
    },
  },
  render: () => <PortfolioExample />,
};

const kpis = [
  {
    color: 'var(--chart-3)',
    data: sparkUp,
    direction: 'up',
    label: 'Total Revenue',
    suffix: 'last 30d',
    trend: '3.3%',
    value: 'US$228,451',
  },
  {
    color: 'var(--color-danger)',
    data: sparkDown,
    direction: 'down',
    label: 'Bounce Rate',
    suffix: 'vs last 7d',
    trend: '5.9%',
    value: '42.3%',
  },
  {
    color: 'var(--color-success)',
    data: sparkUp,
    direction: 'up',
    label: 'New Customers',
    suffix: 'this week',
    trend: '1.0%',
    value: '1,234',
  },
] as const;

export const KPIWithChart: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'KPI cards with sparkline LineCharts — demonstrates using LineChart alongside KPI components for dashboard metrics.',
      },
    },
  },
  render: () => (
    <div className='grid w-[900px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
      {kpis.map((kpi) => (
        <KPI key={kpi.label}>
          <KPI.Header>
            <KPI.Title>{kpi.label}</KPI.Title>
          </KPI.Header>
          <KPI.Content className='grid-cols-[1fr_1fr] items-end'>
            <div className='flex flex-col gap-1'>
              {kpi.label === 'Total Revenue' ? (
                <KPI.Value
                  className='text-3xl'
                  currency='USD'
                  maximumFractionDigits={0}
                  style='currency'
                  value={228451}
                />
              ) : kpi.label === 'Bounce Rate' ? (
                <KPI.Value
                  className='text-3xl'
                  maximumFractionDigits={1}
                  style='percent'
                  value={0.423}
                />
              ) : (
                <KPI.Value
                  className='text-3xl'
                  maximumFractionDigits={0}
                  value={1234}
                />
              )}
              <TrendChip trend={kpi.direction} variant='tertiary'>
                {kpi.trend}
                <TrendChip.Suffix>{kpi.suffix}</TrendChip.Suffix>
              </TrendChip>
            </div>
            <LineChart
              data={[...kpi.data]}
              height={70}
              margin={{ bottom: 0, left: 0, right: 0, top: 4 }}
            >
              <LineChart.Line
                dataKey='value'
                dot={false}
                stroke={kpi.color}
                strokeWidth={1.5}
                type='monotone'
              />
            </LineChart>
          </KPI.Content>
        </KPI>
      ))}
    </div>
  ),
};

export const StatsWithChart: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Stats row — the dashboard-demo pattern with stat cards + chart below.',
      },
    },
  },
  render: function Story() {
    const stats = [
      { label: 'Revenue', trend: 'up', trendValue: '3.3%', value: '$228,441' },
      {
        label: 'Expenses',
        trend: 'down',
        trendValue: '3.3%',
        value: '$25,108',
      },
      { label: 'Sales', trend: 'up', trendValue: '3.3%', value: '458' },
    ];
    return (
      <div className='flex w-[700px] flex-col gap-3'>
        <div className='grid grid-cols-3 gap-3'>
          {stats.map((stat) => (
            <Card className='gap-1 rounded-2xl' key={stat.label}>
              <Card.Header>
                <Card.Description className='text-sm font-medium'>
                  {stat.label}
                </Card.Description>
              </Card.Header>
              <Card.Content className='flex flex-row items-center gap-2'>
                <span className='text-foreground flex-1 text-2xl font-semibold'>
                  {stat.value}
                </span>
                <Chip
                  color={stat.trend === 'up' ? 'success' : 'danger'}
                  size='sm'
                  variant='soft'
                >
                  <Icon
                    className='size-3'
                    icon={stat.trend === 'up' ? ArrowUp02Icon : ArrowDown02Icon}
                  />
                  {stat.trendValue}
                </Chip>
              </Card.Content>
            </Card>
          ))}
        </div>
        <Card className='rounded-2xl'>
          <Card.Header className='flex-row items-center justify-between'>
            <Card.Title className='text-base'>Monthly Revenue</Card.Title>
            <Legend items={[{ color: 'var(--chart-3)', label: 'Revenue' }]} />
          </Card.Header>
          <Card.Content>
            <LineChart data={revenueData} height={200}>
              <TrafficAxes currency />
              <LineChart.Line
                dataKey='revenue'
                dot={false}
                name='Revenue'
                stroke='var(--chart-3)'
                strokeWidth={2}
                type='monotone'
              />
              <LineChart.Tooltip
                content={
                  <LineChart.TooltipContent
                    valueFormatter={(value) =>
                      `$${Number(value).toLocaleString()}`
                    }
                  />
                }
              />
            </LineChart>
          </Card.Content>
        </Card>
      </div>
    );
  },
};

const multiData = trafficData.map((item, index) => ({
  ...item,
  directTraffic:
    [800, 1500, 2200, 1800, 2600, 2000, 3100, 2800, 3500, 3200, 4000, 3700][
      index
    ] ?? 0,
  referral:
    [500, 1200, 2100, 2800, 3200, 2600, 4100, 3800, 4500, 5200, 5800, 5100][
      index
    ] ?? 0,
}));
const multiSeries = [
  { color: 'var(--chart-4)', key: 'organic', label: 'Organic' },
  { color: 'var(--chart-3)', key: 'paidAds', label: 'Paid Ads' },
  { color: 'var(--chart-2)', key: 'referral', label: 'Referral' },
  { color: 'var(--chart-1)', key: 'directTraffic', label: 'Direct' },
] as const;

export const MultiLineChartColors: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Multi-line with all four chart colors and line indicators tooltip.',
      },
    },
  },
  render: () => (
    <Card className='w-[600px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Traffic Sources</Card.Title>
        <Legend items={multiSeries} />
      </Card.Header>
      <Card.Content>
        <LineChart data={multiData} height={240}>
          <TrafficAxes />
          {multiSeries.map((series) => (
            <LineChart.Line
              dataKey={series.key}
              dot={false}
              key={series.key}
              name={series.label}
              stroke={series.color}
              strokeWidth={2}
              type='monotone'
            />
          ))}
          <LineChart.Tooltip
            content={<LineChart.TooltipContent indicator='line' />}
          />
        </LineChart>
      </Card.Content>
    </Card>
  ),
};

export const Sparkline: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sparkline — minimal line inside a small container, no axes or grid. Useful inside KPI cards or compact dashboard widgets.',
      },
    },
  },
  render: () => (
    <div className='flex items-center gap-6'>
      {[
        { color: 'var(--color-success)', data: sparkUp, label: 'Revenue' },
        { color: 'var(--color-danger)', data: sparkDown, label: 'Churn' },
        { color: 'var(--chart-3)', data: sparkUp, label: 'Users' },
      ].map((item) => (
        <div className='flex flex-col gap-1' key={item.label}>
          <span className='text-muted text-xs'>{item.label}</span>
          <div className='w-[120px]'>
            <LineChart
              data={item.data}
              height={40}
              margin={{ bottom: 0, left: 0, right: 0, top: 2 }}
            >
              <LineChart.Line
                dataKey='value'
                dot={false}
                stroke={item.color}
                strokeWidth={1.5}
                type='monotone'
              />
            </LineChart>
          </div>
        </div>
      ))}
    </div>
  ),
};

export const CustomTooltip: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Custom tooltip with total row — demonstrates fully custom composition.',
      },
    },
  },
  render: () => (
    <Card className='w-[520px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Sessions</Card.Title>
        <Legend
          items={[
            { color: 'var(--chart-3)', label: 'Organic' },
            { color: 'var(--chart-2)', label: 'Paid Ads' },
          ]}
        />
      </Card.Header>
      <Card.Content>
        <LineChart data={trafficData} height={200}>
          <TrafficAxes />
          <LineChart.Line
            dataKey='organic'
            dot={false}
            name='Organic'
            stroke='var(--chart-3)'
            strokeWidth={2}
            type='monotone'
          />
          <LineChart.Line
            dataKey='paidAds'
            dot={false}
            name='Paid Ads'
            stroke='var(--chart-2)'
            strokeWidth={2}
            type='monotone'
          />
          <LineChart.Tooltip
            content={({ active, label, payload }) => {
              if (!active || !payload?.length) return null;
              const total = payload.reduce(
                (sum, entry) => sum + Number(entry.value ?? 0),
                0,
              );
              return (
                <ChartTooltip indicator='line'>
                  <ChartTooltip.Header>{label}</ChartTooltip.Header>
                  {payload.map((entry) => (
                    <ChartTooltip.Item
                      key={`${String(entry.name)}-${String(entry.dataKey)}`}
                    >
                      <ChartTooltip.Indicator color={entry.stroke} />
                      <ChartTooltip.Label>{entry.name}</ChartTooltip.Label>
                      <ChartTooltip.Value>
                        {Number(entry.value).toLocaleString()}
                      </ChartTooltip.Value>
                    </ChartTooltip.Item>
                  ))}
                  <div className='border-separator mt-1 flex items-center justify-between border-t pt-1.5'>
                    <span className='text-muted text-xs font-medium'>
                      Total
                    </span>
                    <span className='text-foreground text-xs font-semibold'>
                      {total.toLocaleString()}
                    </span>
                  </div>
                </ChartTooltip>
              );
            }}
          />
        </LineChart>
      </Card.Content>
    </Card>
  ),
};

export const WithDots: Story = {
  parameters: { docs: { description: { story: 'With dots on data points.' } } },
  render: () => (
    <Card className='w-[520px] rounded-2xl'>
      <Card.Header>
        <Card.Title className='text-base'>Monthly Revenue</Card.Title>
      </Card.Header>
      <Card.Content>
        <LineChart data={revenueData} height={200}>
          <TrafficAxes currency />
          <LineChart.Line
            activeDot={{ r: 5 }}
            dataKey='revenue'
            dot={{ fill: 'var(--chart-3)', r: 3, strokeWidth: 0 }}
            name='Revenue'
            stroke='var(--chart-3)'
            strokeWidth={2}
            type='monotone'
          />
          <LineChart.Tooltip
            content={
              <LineChart.TooltipContent
                valueFormatter={(value) => `$${Number(value).toLocaleString()}`}
              />
            }
          />
        </LineChart>
      </Card.Content>
    </Card>
  ),
};

export const DashedComparison: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Dashed + solid lines for comparison (e.g. actual vs target).',
      },
    },
  },
  render: function Story() {
    const data = revenueData.map((item, index) => ({
      actual: item.revenue,
      month: item.month,
      target:
        [
          5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000, 9500, 10000,
          10500,
        ][index] ?? 0,
    }));
    return (
      <Card className='w-[520px] rounded-2xl'>
        <Card.Header className='flex-row items-center justify-between'>
          <Card.Title className='text-base'>Actual vs Target</Card.Title>
          <Legend
            items={[
              { color: 'var(--chart-3)', label: 'Actual' },
              { color: 'var(--chart-2)', dashed: true, label: 'Target' },
            ]}
          />
        </Card.Header>
        <Card.Content>
          <LineChart data={data} height={200}>
            <TrafficAxes currency />
            <LineChart.Line
              dataKey='target'
              dot={false}
              name='Target'
              stroke='var(--chart-2)'
              strokeDasharray='5 5'
              strokeWidth={2}
              type='monotone'
            />
            <LineChart.Line
              dataKey='actual'
              dot={false}
              name='Actual'
              stroke='var(--chart-3)'
              strokeWidth={2}
              type='monotone'
            />
            <LineChart.Tooltip
              content={
                <LineChart.TooltipContent
                  valueFormatter={(value) =>
                    `$${Number(value).toLocaleString()}`
                  }
                />
              }
            />
          </LineChart>
        </Card.Content>
      </Card>
    );
  },
};
