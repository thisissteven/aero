import type { Meta, StoryObj } from '@storybook/react';

import { ArrowUp02Icon, Icon } from '@aero/ui/icons';

import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { Chip } from '@/components/data-display/chip';
import { KPI } from '@/components/data-display/kpi';
import { TrendChip } from '@/components/data-display/trend-chip';
import { Card } from '@/components/layout/card';

import { BarChart } from './index';

const meta = {
  component: BarChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Charts/BarChart',
} satisfies Meta<typeof BarChart>;

export default meta;
type Story = StoryObj<typeof meta>;

const sales = [18, 32, 28, 45, 38, 52, 42, 55, 48, 60, 53, 58].map(
  (value, index) => ({
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
    sales: value,
  }),
);

const channels = [
  { direct: 3200, month: 'Jan', online: 4200, retail: 2800 },
  { direct: 4100, month: 'Feb', online: 5800, retail: 3400 },
  { direct: 3800, month: 'Mar', online: 4900, retail: 3100 },
  { direct: 5200, month: 'Apr', online: 7200, retail: 4200 },
  { direct: 4600, month: 'May', online: 6100, retail: 3800 },
  { direct: 5800, month: 'Jun', online: 8400, retail: 4500 },
];

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
          'Pill-shaped bars matching the dashboard-demo convention. `radius={[24, 24, 24, 24]}` creates fully rounded bars.',
      },
    },
  },
  render: () => (
    <Card className='w-full max-w-[480px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <div>
          <Card.Title className='text-base'>Daily Sales</Card.Title>
          <Card.Description className='text-muted text-xs'>
            Units sold per month
          </Card.Description>
        </div>
        <Chip color='success' size='sm' variant='soft'>
          <Icon icon={ArrowUp02Icon} size={12} />
          12.5%
        </Chip>
      </Card.Header>
      <Card.Content>
        <BarChart data={sales} height={200}>
          <BarChart.Grid vertical={false} />
          <BarChart.XAxis dataKey='month' tickMargin={8} />
          <BarChart.YAxis width={30} />
          <BarChart.Bar
            barSize={16}
            dataKey='sales'
            fill='var(--accent)'
            radius={[24, 24, 24, 24]}
          />
          <BarChart.Tooltip
            content={({ active, label, payload }) =>
              !active || !payload?.length ? null : (
                <ChartTooltip>
                  <ChartTooltip.Header>{label}</ChartTooltip.Header>
                  {payload.map((entry) => (
                    <ChartTooltip.Item key={String(entry.dataKey)}>
                      <ChartTooltip.Indicator
                        color={entry.color ?? entry.fill}
                      />
                      <ChartTooltip.Label>
                        {entry.name ?? 'Sales'}
                      </ChartTooltip.Label>
                      <ChartTooltip.Value>
                        {entry.value} units
                      </ChartTooltip.Value>
                    </ChartTooltip.Item>
                  ))}
                </ChartTooltip>
              )
            }
          />
        </BarChart>
      </Card.Content>
    </Card>
  ),
};

const channelSeries = [
  { color: 'var(--chart-3)', key: 'online', label: 'Online' },
  { color: 'var(--chart-2)', key: 'retail', label: 'Retail' },
  { color: 'var(--chart-1)', key: 'direct', label: 'Direct' },
] as const;

export const Grouped: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Grouped bars — multiple series side by side for comparison. Uses chart color variables for each series.',
      },
    },
  },
  render: () => (
    <Card className='w-full max-w-[480px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Revenue by Channel</Card.Title>
        <Legend items={channelSeries} />
      </Card.Header>
      <Card.Content>
        <BarChart data={channels} height={220}>
          <BarChart.Grid vertical={false} />
          <BarChart.XAxis dataKey='month' tickMargin={8} />
          <BarChart.YAxis
            tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
            width={40}
          />
          {channelSeries.map((series) => (
            <BarChart.Bar
              barSize={10}
              dataKey={series.key}
              fill={series.color}
              key={series.key}
              name={series.label}
              radius={[4, 4, 0, 0]}
            />
          ))}
          <BarChart.Tooltip
            content={
              <BarChart.TooltipContent
                valueFormatter={(value) => `$${Number(value).toLocaleString()}`}
              />
            }
          />
        </BarChart>
      </Card.Content>
    </Card>
  ),
};

const plans = [
  { enterprise: 12000, pro: 8000, quarter: 'Q1', starter: 4000 },
  { enterprise: 15000, pro: 10000, quarter: 'Q2', starter: 5000 },
  { enterprise: 18000, pro: 12000, quarter: 'Q3', starter: 6000 },
  { enterprise: 22000, pro: 14000, quarter: 'Q4', starter: 7000 },
];

export const Stacked: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Stacked bars — segments stacked to show totals and breakdown.',
      },
    },
  },
  render: () => (
    <Card className='w-full max-w-[480px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Revenue by Plan</Card.Title>
        <Legend
          items={[
            { color: 'var(--chart-4)', label: 'Enterprise' },
            { color: 'var(--chart-3)', label: 'Pro' },
            { color: 'var(--chart-1)', label: 'Starter' },
          ]}
        />
      </Card.Header>
      <Card.Content>
        <BarChart data={plans} height={220}>
          <BarChart.Grid vertical={false} />
          <BarChart.XAxis dataKey='quarter' tickMargin={8} />
          <BarChart.YAxis
            tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
            width={40}
          />
          <BarChart.Bar
            barSize={32}
            dataKey='starter'
            fill='var(--chart-1)'
            name='Starter'
            stackId='revenue'
          />
          <BarChart.Bar
            barSize={32}
            dataKey='pro'
            fill='var(--chart-3)'
            name='Pro'
            stackId='revenue'
          />
          <BarChart.Bar
            barSize={32}
            dataKey='enterprise'
            fill='var(--chart-4)'
            name='Enterprise'
            radius={[4, 4, 0, 0]}
            stackId='revenue'
          />
          <BarChart.Tooltip
            content={
              <BarChart.TooltipContent
                indicator='line'
                valueFormatter={(value) => `$${Number(value).toLocaleString()}`}
              />
            }
          />
        </BarChart>
      </Card.Content>
    </Card>
  ),
};

export const Horizontal: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Horizontal bars — great for ranking/leaderboard data. Uses `layout="vertical"` on the underlying Recharts BarChart.',
      },
    },
  },
  render: () => (
    <Card className='w-full max-w-[420px] rounded-2xl'>
      <Card.Header>
        <Card.Title className='text-base'>Top Products</Card.Title>
        <Card.Description className='text-muted text-xs'>
          Units sold this quarter
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <BarChart
          data={[
            { product: 'Widgets', units: 1842 },
            { product: 'Gadgets', units: 1567 },
            { product: 'Modules', units: 1231 },
            { product: 'Plugins', units: 985 },
            { product: 'Add-ons', units: 743 },
          ]}
          height={220}
          layout='vertical'
        >
          <BarChart.XAxis tickMargin={4} type='number' />
          <BarChart.YAxis
            dataKey='product'
            tickMargin={4}
            type='category'
            width={60}
          />
          <BarChart.Bar
            barSize={14}
            dataKey='units'
            fill='var(--chart-3)'
            name='Units'
            radius={[0, 24, 24, 0]}
          />
          <BarChart.Tooltip content={<BarChart.TooltipContent />} />
        </BarChart>
      </Card.Content>
    </Card>
  ),
};

const energy = [
  { day: 'Mon', high: 180, low: 120, medium: 280 },
  { day: 'Tue', high: 220, low: 150, medium: 320 },
  { day: 'Wed', high: 150, low: 180, medium: 250 },
  { day: 'Thu', high: 180, low: 140, medium: 290 },
  { day: 'Fri', high: 190, low: 160, medium: 270 },
  { day: 'Sat', high: 210, low: 130, medium: 240 },
  { day: 'Sun', high: 240, low: 170, medium: 300 },
];

export const HorizontalStacked: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Horizontal stacked bars — segments stacked left to right. Only the leftmost segment has rounded left corners and the rightmost has rounded right corners.',
      },
    },
  },
  render: () => (
    <Card className='w-full max-w-[480px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <div>
          <Card.Title className='text-base'>Avg. Energy Activity</Card.Title>
          <div className='text-foreground mt-1 text-2xl font-bold'>
            580/280 <span className='text-muted text-sm font-normal'>kcal</span>
          </div>
        </div>
      </Card.Header>
      <Card.Content className='flex flex-col gap-3'>
        <BarChart
          data={energy}
          height={280}
          layout='vertical'
          margin={{ bottom: 0, left: 0, right: 0, top: 0 }}
        >
          <BarChart.XAxis hide type='number' />
          <BarChart.YAxis
            dataKey='day'
            tickMargin={8}
            type='category'
            width={36}
          />
          <BarChart.Bar
            barSize={18}
            dataKey='low'
            fill='var(--chart-1)'
            name='Low'
            radius={[4, 0, 0, 4]}
            stackId='energy'
          />
          <BarChart.Bar
            barSize={18}
            dataKey='medium'
            fill='var(--chart-2)'
            name='Medium'
            stackId='energy'
          />
          <BarChart.Bar
            barSize={18}
            dataKey='high'
            fill='var(--chart-4)'
            name='High'
            radius={[0, 4, 4, 0]}
            stackId='energy'
          />
          <BarChart.Tooltip
            content={
              <BarChart.TooltipContent
                indicator='line'
                valueFormatter={(value) => `${value} kcal`}
              />
            }
          />
        </BarChart>
        <div className='flex items-center justify-center gap-4'>
          <Legend
            items={[
              { color: 'var(--chart-1)', label: 'Low' },
              { color: 'var(--chart-2)', label: 'Medium' },
              { color: 'var(--chart-4)', label: 'High' },
            ]}
          />
        </div>
      </Card.Content>
    </Card>
  ),
};

export const Comparison: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Week-over-week comparison with this week vs last week. Semi-transparent bars for the previous period.',
      },
    },
  },
  render: function Story() {
    const data = [
      { current: 120, day: 'Mon', previous: 90 },
      { current: 180, day: 'Tue', previous: 150 },
      { current: 150, day: 'Wed', previous: 170 },
      { current: 210, day: 'Thu', previous: 140 },
      { current: 190, day: 'Fri', previous: 160 },
      { current: 80, day: 'Sat', previous: 100 },
      { current: 60, day: 'Sun', previous: 70 },
    ];
    return (
      <Card className='w-full max-w-[480px] rounded-2xl'>
        <Card.Header className='flex-row items-center justify-between'>
          <div>
            <Card.Title className='text-base'>Weekly Orders</Card.Title>
            <Card.Description className='text-muted text-xs'>
              This week vs last week
            </Card.Description>
          </div>
          <Legend
            items={[
              { color: 'var(--chart-3)', label: 'This week' },
              { color: 'var(--chart-1)', label: 'Last week' },
            ]}
          />
        </Card.Header>
        <Card.Content>
          <BarChart data={data} height={200}>
            <BarChart.Grid vertical={false} />
            <BarChart.XAxis dataKey='day' tickMargin={8} />
            <BarChart.YAxis width={30} />
            <BarChart.Bar
              barSize={12}
              dataKey='current'
              fill='var(--chart-3)'
              name='This week'
              radius={[4, 4, 0, 0]}
            />
            <BarChart.Bar
              barSize={12}
              dataKey='previous'
              fill='var(--chart-1)'
              name='Last week'
              radius={[4, 4, 0, 0]}
            />
            <BarChart.Tooltip content={<BarChart.TooltipContent />} />
          </BarChart>
        </Card.Content>
      </Card>
    );
  },
};

export const KPIWithBarChart: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'KPI card with bar chart — matching the dashboard-demo sales card.',
      },
    },
  },
  render: () => (
    <KPI className='w-full max-w-[400px]'>
      <KPI.Header>
        <KPI.Title>Monthly Sales</KPI.Title>
      </KPI.Header>
      <KPI.Content className='flex flex-col gap-3'>
        <div className='flex gap-3 self-start'>
          <KPI.Value
            className='text-3xl'
            maximumFractionDigits={0}
            value={278}
          />
          <TrendChip trend='up' variant='tertiary'>
            3.3%
            <TrendChip.Suffix>last 30d</TrendChip.Suffix>
          </TrendChip>
        </div>
        <BarChart data={sales} height={160}>
          <BarChart.Grid vertical={false} />
          <BarChart.XAxis dataKey='month' tickMargin={8} />
          <BarChart.Bar
            barSize={16}
            dataKey='sales'
            fill='var(--accent)'
            radius={[24, 24, 24, 24]}
          />
          <BarChart.Tooltip content={<BarChart.TooltipContent />} />
        </BarChart>
      </KPI.Content>
    </KPI>
  ),
};

export const CustomTooltip: Story = {
  parameters: {
    docs: {
      description: { story: 'Custom tooltip with total row on grouped bars.' },
    },
  },
  render: () => (
    <Card className='w-full max-w-[480px] rounded-2xl'>
      <Card.Header>
        <Card.Title className='text-base'>Revenue by Channel</Card.Title>
      </Card.Header>
      <Card.Content>
        <BarChart data={channels} height={220}>
          <BarChart.Grid vertical={false} />
          <BarChart.XAxis dataKey='month' tickMargin={8} />
          <BarChart.YAxis
            tickFormatter={(value: number) => `$${(value / 1000).toFixed(0)}k`}
            width={40}
          />
          {channelSeries.map((series) => (
            <BarChart.Bar
              barSize={10}
              dataKey={series.key}
              fill={series.color}
              key={series.key}
              name={series.label}
              radius={[4, 4, 0, 0]}
            />
          ))}
          <BarChart.Tooltip
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
                <ChartTooltip>
                  <ChartTooltip.Header>{label}</ChartTooltip.Header>
                  {payload.map((entry) => (
                    <ChartTooltip.Item
                      key={`${String(entry.name)}-${String(entry.dataKey)}`}
                    >
                      <ChartTooltip.Indicator color={entry.fill} />
                      <ChartTooltip.Label>{entry.name}</ChartTooltip.Label>
                      <ChartTooltip.Value>
                        ${Number(entry.value).toLocaleString()}
                      </ChartTooltip.Value>
                    </ChartTooltip.Item>
                  ))}
                  <div className='border-separator mt-1 flex items-center justify-between border-t pt-1.5'>
                    <span className='text-muted text-xs font-medium'>
                      Total
                    </span>
                    <span className='text-foreground text-xs font-semibold'>
                      ${total.toLocaleString()}
                    </span>
                  </div>
                </ChartTooltip>
              );
            }}
          />
        </BarChart>
      </Card.Content>
    </Card>
  ),
};
