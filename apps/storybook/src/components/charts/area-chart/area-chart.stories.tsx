import type { Meta, StoryObj } from '@storybook/react';

import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { KPI } from '@/components/data-display/kpi';
import { TrendChip } from '@/components/data-display/trend-chip';
import { Card } from '@/components/layout/card';

import { AreaChart } from './index';

const meta = {
  component: AreaChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Charts/AreaChart',
} satisfies Meta<typeof AreaChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const trafficData = [
  { month: 'Jan', organic: 2000, paidAds: 1000 },
  { month: 'Feb', organic: 5000, paidAds: 3000 },
  { month: 'Mar', organic: 8000, paidAds: 5000 },
  { month: 'Apr', organic: 7000, paidAds: 6000 },
  { month: 'May', organic: 9500, paidAds: 4000 },
  { month: 'Jun', organic: 8000, paidAds: 5500 },
  { month: 'Jul', organic: 12000, paidAds: 7000 },
  { month: 'Aug', organic: 11000, paidAds: 6500 },
  { month: 'Sep', organic: 14000, paidAds: 8000 },
  { month: 'Oct', organic: 13000, paidAds: 9000 },
  { month: 'Nov', organic: 16000, paidAds: 10000 },
  { month: 'Dec', organic: 15000, paidAds: 9500 },
];

const revenueData = [
  { month: 'Jan', revenue: 4200 },
  { month: 'Feb', revenue: 5800 },
  { month: 'Mar', revenue: 4900 },
  { month: 'Apr', revenue: 7200 },
  { month: 'May', revenue: 6100 },
  { month: 'Jun', revenue: 8400 },
  { month: 'Jul', revenue: 7800 },
  { month: 'Aug', revenue: 9200 },
  { month: 'Sep', revenue: 8600 },
  { month: 'Oct', revenue: 10200 },
  { month: 'Nov', revenue: 9800 },
  { month: 'Dec', revenue: 11500 },
];

const sparkUp = [30, 35, 28, 42, 38, 45, 50, 48, 55, 60, 58, 65].map(
  (value) => ({ value }),
);
const sparkDown = [65, 60, 62, 55, 58, 52, 50, 48, 45, 42, 44, 40].map(
  (value) => ({ value }),
);

function AxisSet() {
  return (
    <>
      <AreaChart.Grid vertical={false} />
      <AreaChart.XAxis dataKey='month' tickMargin={8} />
      <AreaChart.YAxis
        tickFormatter={(value: number) =>
          value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
        }
        width={30}
      />
    </>
  );
}

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

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Single area with gradient fill — the most common area chart pattern. Uses a linearGradient from the stroke color (0.2 → 0.02 opacity), matching the KPI.Chart gradient convention.',
      },
    },
  },
  render: () => (
    <Card className='w-full max-w-[520px] rounded-2xl'>
      <Card.Header>
        <Card.Title className='text-base'>Monthly Revenue</Card.Title>
      </Card.Header>
      <Card.Content>
        <AreaChart data={revenueData} height={200}>
          <defs>
            <linearGradient id='revenue-fill' x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0%' stopColor='var(--chart-3)' stopOpacity={0.2} />
              <stop
                offset='100%'
                stopColor='var(--chart-3)'
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
          <AreaChart.Grid vertical={false} />
          <AreaChart.XAxis dataKey='month' tickMargin={8} />
          <AreaChart.YAxis
            tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
            width={40}
          />
          <AreaChart.Area
            dataKey='revenue'
            dot={false}
            fill='url(#revenue-fill)'
            name='Revenue'
            stroke='var(--chart-3)'
            strokeWidth={2}
            type='monotone'
          />
          <AreaChart.Tooltip
            content={({ active, label, payload }) =>
              !active || !payload?.length ? null : (
                <ChartTooltip>
                  <ChartTooltip.Header>{label}</ChartTooltip.Header>
                  {payload.map((entry) => (
                    <ChartTooltip.Item key={String(entry.dataKey)}>
                      <ChartTooltip.Indicator
                        color={entry.color ?? entry.stroke}
                      />
                      <ChartTooltip.Label>{entry.name}</ChartTooltip.Label>
                      <ChartTooltip.Value>
                        ${Number(entry.value).toLocaleString()}
                      </ChartTooltip.Value>
                    </ChartTooltip.Item>
                  ))}
                </ChartTooltip>
              )
            }
          />
        </AreaChart>
      </Card.Content>
    </Card>
  ),
};

export const MultiArea: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Multi-area with overlapping gradients and legend.',
      },
    },
  },
  render: () => (
    <Card className='w-full max-w-[520px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Traffic Sources</Card.Title>
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
        <AreaChart data={trafficData} height={200}>
          <defs>
            {[
              ['organic-fill', 'var(--chart-3)'],
              ['paidads-fill', 'var(--chart-1)'],
            ].map(([id, color]) => (
              <linearGradient id={id} key={id} x1='0' x2='0' y1='0' y2='1'>
                <stop offset='0%' stopColor={color} stopOpacity={0.2} />
                <stop offset='100%' stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <AxisSet />
          <AreaChart.Area
            dataKey='organic'
            dot={false}
            fill='url(#organic-fill)'
            name='Organic'
            stroke='var(--chart-3)'
            strokeWidth={2}
            type='monotone'
          />
          <AreaChart.Area
            dataKey='paidAds'
            dot={false}
            fill='url(#paidads-fill)'
            name='Paid Ads'
            stroke='var(--chart-1)'
            strokeWidth={2}
            type='monotone'
          />
          <AreaChart.Tooltip content={<AreaChart.TooltipContent />} />
        </AreaChart>
      </Card.Content>
    </Card>
  ),
};

const stackedData = trafficData.map((item, index) => ({
  ...item,
  direct:
    [800, 1500, 2200, 1800, 2600, 2000, 3100, 2800, 3500, 3200, 4000, 3700][
      index
    ] ?? 0,
  referral:
    [500, 1200, 2100, 2800, 3200, 2600, 4100, 3800, 4500, 5200, 5800, 5100][
      index
    ] ?? 0,
}));

export const Stacked: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Stacked area chart — areas layered on top of each other. Uses all four chart color variables.',
      },
    },
  },
  render: function Story() {
    const series = [
      { color: 'var(--chart-4)', key: 'organic', label: 'Organic' },
      { color: 'var(--chart-3)', key: 'paidAds', label: 'Paid Ads' },
      { color: 'var(--chart-2)', key: 'referral', label: 'Referral' },
      { color: 'var(--chart-1)', key: 'direct', label: 'Direct' },
    ];

    return (
      <Card className='w-full max-w-[600px] rounded-2xl'>
        <Card.Header className='flex-row items-center justify-between'>
          <Card.Title className='text-base'>Traffic Breakdown</Card.Title>
          <Legend items={series} />
        </Card.Header>
        <Card.Content>
          <AreaChart data={stackedData} height={240}>
            <defs>
              {series.map(({ color, key }) => (
                <linearGradient
                  id={`stacked-${key}`}
                  key={key}
                  x1='0'
                  x2='0'
                  y1='0'
                  y2='1'
                >
                  <stop offset='0%' stopColor={color} stopOpacity={0.4} />
                  <stop offset='100%' stopColor={color} stopOpacity={0.1} />
                </linearGradient>
              ))}
            </defs>
            <AxisSet />
            {series.map(({ color, key, label }) => (
              <AreaChart.Area
                dataKey={key}
                dot={false}
                fill={`url(#stacked-${key})`}
                key={key}
                name={label}
                stackId='traffic'
                stroke={color}
                strokeWidth={2}
                type='monotone'
              />
            ))}
            <AreaChart.Tooltip
              content={<AreaChart.TooltipContent indicator='line' />}
            />
          </AreaChart>
        </Card.Content>
      </Card>
    );
  },
};

function SparkArea({
  color,
  data,
  id,
  label,
}: {
  color: string;
  data: { value: number }[];
  id: string;
  label: string;
}) {
  return (
    <div className='flex min-w-0 flex-1 flex-col gap-1'>
      <span className='text-muted text-xs'>{label}</span>
      <AreaChart
        data={data}
        height={48}
        margin={{ bottom: 0, left: 0, right: 0, top: 2 }}
      >
        <defs>
          <linearGradient id={id} x1='0' x2='0' y1='0' y2='1'>
            <stop offset='0%' stopColor={color} stopOpacity={0.2} />
            <stop offset='100%' stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <AreaChart.Area
          dataKey='value'
          dot={false}
          fill={`url(#${id})`}
          stroke={color}
          strokeWidth={1.5}
          type='monotone'
        />
      </AreaChart>
    </div>
  );
}

export const Sparkline: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Sparkline area — minimal chart matching the KPI.Chart gradient convention. No axes, no grid — just the filled area.',
      },
    },
  },
  render: () => (
    <div className='flex w-full items-center gap-6'>
      <SparkArea
        color='var(--color-success)'
        data={sparkUp}
        id='spark-up'
        label='Revenue'
      />
      <SparkArea
        color='var(--color-danger)'
        data={sparkDown}
        id='spark-down'
        label='Churn'
      />
      <SparkArea
        color='var(--chart-3)'
        data={sparkUp}
        id='spark-accent'
        label='Users'
      />
    </div>
  ),
};

const kpis = [
  {
    color: 'var(--chart-3)',
    data: sparkUp,
    direction: 'up',
    id: 'kpi-revenue',
    label: 'Total Revenue',
    suffix: 'last 30d',
    trend: '3.3%',
    value: 'US$228,451',
  },
  {
    color: 'var(--color-danger)',
    data: sparkDown,
    direction: 'down',
    id: 'kpi-bounce',
    label: 'Bounce Rate',
    suffix: 'vs last 7d',
    trend: '5.9%',
    value: '42.3%',
  },
  {
    color: 'var(--color-success)',
    data: sparkUp,
    direction: 'up',
    id: 'kpi-users',
    label: 'Active Users',
    suffix: 'this month',
    trend: '10.9%',
    value: '98k',
  },
] as const;

export const KPIWithAreaChart: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'KPI cards with inline area sparklines — mirrors the KPI WithChartInline story but uses AreaChart instead of KPI.Chart.',
      },
    },
  },
  render: () => (
    <div className='grid w-full max-w-[900px] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3'>
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
                  notation='compact'
                  value={97859}
                />
              )}
              <TrendChip trend={kpi.direction} variant='tertiary'>
                {kpi.trend}
                <TrendChip.Suffix>{kpi.suffix}</TrendChip.Suffix>
              </TrendChip>
            </div>
            <div className='min-w-0'>
              <AreaChart
                data={[...kpi.data]}
                height={70}
                margin={{ bottom: 0, left: 0, right: 0, top: 4 }}
              >
                <defs>
                  <linearGradient id={kpi.id} x1='0' x2='0' y1='0' y2='1'>
                    <stop offset='0%' stopColor={kpi.color} stopOpacity={0.2} />
                    <stop
                      offset='100%'
                      stopColor={kpi.color}
                      stopOpacity={0.02}
                    />
                  </linearGradient>
                </defs>
                <AreaChart.Area
                  dataKey='value'
                  dot={false}
                  fill={`url(#${kpi.id})`}
                  stroke={kpi.color}
                  strokeWidth={1.5}
                  type='monotone'
                />
              </AreaChart>
            </div>
          </KPI.Content>
        </KPI>
      ))}
    </div>
  ),
};

export const CustomTooltip: Story = {
  parameters: {
    docs: { description: { story: 'Custom tooltip with total row.' } },
  },
  render: () => (
    <Card className='w-full max-w-[520px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Sessions</Card.Title>
        <Legend
          items={[
            { color: 'var(--chart-3)', label: 'Organic' },
            { color: 'var(--chart-1)', label: 'Paid Ads' },
          ]}
        />
      </Card.Header>
      <Card.Content>
        <AreaChart data={trafficData} height={200}>
          <defs>
            {[
              ['custom-organic', 'var(--chart-3)'],
              ['custom-paid', 'var(--chart-1)'],
            ].map(([id, color]) => (
              <linearGradient id={id} key={id} x1='0' x2='0' y1='0' y2='1'>
                <stop offset='0%' stopColor={color} stopOpacity={0.2} />
                <stop offset='100%' stopColor={color} stopOpacity={0.02} />
              </linearGradient>
            ))}
          </defs>
          <AxisSet />
          <AreaChart.Area
            dataKey='organic'
            dot={false}
            fill='url(#custom-organic)'
            name='Organic'
            stroke='var(--chart-3)'
            strokeWidth={2}
            type='monotone'
          />
          <AreaChart.Area
            dataKey='paidAds'
            dot={false}
            fill='url(#custom-paid)'
            name='Paid Ads'
            stroke='var(--chart-1)'
            strokeWidth={2}
            type='monotone'
          />
          <AreaChart.Tooltip
            content={({ active, label, payload }) => {
              if (
                !active ||
                !payload?.length ||
                !payload.every((entry) => typeof entry.value === 'number')
              )
                return null;
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
        </AreaChart>
      </Card.Content>
    </Card>
  ),
};
