import type { Meta, StoryObj } from '@storybook/react';

import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { Card } from '@/components/layout/card';

import { PieChart } from './index';

const meta = {
  component: PieChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Charts/PieChart',
} satisfies Meta<typeof PieChart>;
export default meta;
type Story = StoryObj<typeof meta>;

const colors = [
  'var(--chart-4)',
  'var(--chart-3)',
  'var(--chart-2)',
  'var(--chart-1)',
];

interface PieTooltipProps {
  active?: boolean;
  payload?: Array<{
    name?: string;
    payload?: { fill?: string };
    value?: number | string;
  }>;
  valueFormatter?: (value: number | string) => React.ReactNode;
}

function PieTooltip({ active, payload, valueFormatter }: PieTooltipProps) {
  const item = payload?.[0];
  if (!active || !item) return null;
  return (
    <ChartTooltip>
      <ChartTooltip.Item>
        <ChartTooltip.Indicator color={item.payload?.fill} />
        <ChartTooltip.Label>{item.name}</ChartTooltip.Label>
        <ChartTooltip.Value>
          {valueFormatter ? valueFormatter(item.value ?? '') : item.value}
        </ChartTooltip.Value>
      </ChartTooltip.Item>
    </ChartTooltip>
  );
}

function Cells({ data }: { data: ReadonlyArray<unknown> }) {
  return (
    <>
      {data.map((_, index) => (
        // Recharts cells mirror the immutable input order and have no independent identity.
        // oxlint-disable-next-line react/no-array-index-key
        <PieChart.Cell fill={colors[index % colors.length]} key={index} />
      ))}
    </>
  );
}

function Legend({
  data,
  suffix,
}: {
  data: ReadonlyArray<{ name: string; value: number }>;
  suffix?: string;
}) {
  return (
    <div className='flex flex-wrap justify-center gap-x-4 gap-y-1.5'>
      {data.map((item, index) => (
        <div className='flex items-center gap-1.5' key={item.name}>
          <span
            className='size-2.5 rounded-full'
            style={{ backgroundColor: colors[index % colors.length] }}
          />
          <span className='text-muted text-xs'>
            {item.name}
            {suffix !== undefined
              ? ` (${item.value.toLocaleString()}${suffix})`
              : ''}
          </span>
        </div>
      ))}
    </div>
  );
}

const browsers = [
  { name: 'Chrome', value: 62 },
  { name: 'Safari', value: 19 },
  { name: 'Firefox', value: 10 },
  { name: 'Edge', value: 9 },
];

export const Default: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Classic pie chart with chart color palette and a legend.',
      },
    },
  },
  render: () => (
    <Card className='w-[360px] rounded-2xl'>
      <Card.Header>
        <Card.Title className='text-base'>Browser Usage</Card.Title>
      </Card.Header>
      <Card.Content className='flex flex-col items-center gap-4'>
        <PieChart height={220}>
          <PieChart.Pie
            cx='50%'
            cy='50%'
            data={browsers}
            dataKey='value'
            nameKey='name'
            outerRadius={90}
          >
            <Cells data={browsers} />
          </PieChart.Pie>
          <PieChart.Tooltip content={<PieTooltip />} />
        </PieChart>
        <Legend data={browsers} />
      </Card.Content>
    </Card>
  ),
};

const traffic = [
  { name: 'Organic', value: 4500 },
  { name: 'Direct', value: 3200 },
  { name: 'Referral', value: 2100 },
  { name: 'Social', value: 1400 },
];

export const Donut: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Donut chart — a pie with an inner radius creating a ring shape.',
      },
    },
  },
  render: () => (
    <Card className='w-[360px] rounded-2xl'>
      <Card.Header>
        <Card.Title className='text-base'>Traffic Sources</Card.Title>
      </Card.Header>
      <Card.Content className='flex flex-col items-center gap-4'>
        <PieChart height={220}>
          <PieChart.Pie
            cornerRadius={12}
            cx='50%'
            cy='50%'
            data={traffic}
            dataKey='value'
            innerRadius='68%'
            nameKey='name'
            paddingAngle={-20}
            strokeWidth={0}
          >
            <Cells data={traffic} />
          </PieChart.Pie>
          <PieChart.Tooltip
            content={
              <PieTooltip
                valueFormatter={(value) => Number(value).toLocaleString()}
              />
            }
          />
        </PieChart>
        <Legend data={traffic} suffix='' />
      </Card.Content>
    </Card>
  ),
};

const storage = [
  { name: 'Documents', value: 42 },
  { name: 'Media', value: 28 },
  { name: 'Apps', value: 18 },
  { name: 'Other', value: 12 },
];

export const DonutWithLabel: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Donut with a center label showing total or key metric. Uses absolute-positioned HTML content for reliable centering.',
      },
    },
  },
  render: function Story() {
    const total = storage.reduce((sum, item) => sum + item.value, 0);
    return (
      <Card className='w-[360px] rounded-2xl'>
        <Card.Header>
          <Card.Title className='text-base'>Storage Usage</Card.Title>
          <Card.Description className='text-muted text-xs'>
            {total} GB of 128 GB used
          </Card.Description>
        </Card.Header>
        <Card.Content className='flex flex-col items-center gap-4'>
          <div className='relative'>
            <PieChart height={220} width={220}>
              <PieChart.Pie
                cornerRadius={12}
                cx='50%'
                cy='50%'
                data={storage}
                dataKey='value'
                innerRadius='68%'
                nameKey='name'
                paddingAngle={-20}
                strokeWidth={0}
              >
                <Cells data={storage} />
              </PieChart.Pie>
              <PieChart.Tooltip
                content={
                  <PieTooltip valueFormatter={(value) => `${value} GB`} />
                }
              />
            </PieChart>
            <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
              <span className='text-foreground text-2xl font-bold'>
                {total}
              </span>
              <span className='text-muted text-xs'>GB used</span>
            </div>
          </div>
          <Legend data={storage} suffix=' GB' />
        </Card.Content>
      </Card>
    );
  },
};

const devices = [
  { name: 'Mobile', value: 2800 },
  { name: 'Desktop', value: 1200 },
  { name: 'Tablet', value: 500 },
];

export const DonutWithContent: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Donut with rich HTML content centered inside using absolute positioning. Matches the "4.5K Devices" dashboard widget pattern.',
      },
    },
  },
  render: function Story() {
    const total = devices.reduce((sum, item) => sum + item.value, 0);
    return (
      <Card className='w-[360px] rounded-2xl'>
        <Card.Header>
          <Card.Title className='text-base'>Connected Devices</Card.Title>
        </Card.Header>
        <Card.Content className='flex flex-col items-center gap-4'>
          <div className='relative'>
            <PieChart height={240} width={240}>
              <PieChart.Pie
                cornerRadius={12}
                cx='50%'
                cy='50%'
                data={devices}
                dataKey='value'
                innerRadius='68%'
                nameKey='name'
                paddingAngle={-20}
                strokeWidth={0}
              >
                <Cells data={devices} />
              </PieChart.Pie>
              <PieChart.Tooltip content={<PieTooltip />} />
            </PieChart>
            <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
              <span className='text-foreground text-3xl font-bold'>
                {(total / 1000).toFixed(1)}K
              </span>
              <span className='text-muted text-sm'>Devices</span>
            </div>
          </div>
          <div className='flex flex-col gap-2'>
            {devices.map((item, index) => (
              <div className='flex items-center gap-3' key={item.name}>
                <span
                  className='size-3 shrink-0 rounded-full'
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <span className='text-foreground w-16 text-sm'>
                  {item.name}
                </span>
                <span className='text-foreground text-sm font-semibold'>
                  {item.value.toLocaleString()}
                </span>
                <span className='text-muted text-xs'>
                  ({((item.value / total) * 100).toFixed(0)}%)
                </span>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    );
  },
};

const plans = [
  { name: 'Enterprise', value: 340 },
  { name: 'Pro', value: 520 },
  { name: 'Starter', value: 280 },
];

export const WithBreakdown: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Side-by-side layout with the chart on the left and a breakdown list on the right.',
      },
    },
  },
  render: function Story() {
    const total = plans.reduce((sum, item) => sum + item.value, 0);
    return (
      <Card className='w-[460px] rounded-2xl'>
        <Card.Header>
          <Card.Title className='text-base'>Users by Plan</Card.Title>
        </Card.Header>
        <Card.Content className='flex flex-row items-center gap-6'>
          <div className='relative shrink-0'>
            <PieChart height={180} width={180}>
              <PieChart.Pie
                cornerRadius={12}
                cx='50%'
                cy='50%'
                data={plans}
                dataKey='value'
                innerRadius='68%'
                nameKey='name'
                paddingAngle={-20}
                strokeWidth={0}
              >
                <Cells data={plans} />
              </PieChart.Pie>
              <PieChart.Tooltip content={<PieTooltip />} />
            </PieChart>
            <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
              <span className='text-foreground text-xl font-bold'>
                {total.toLocaleString()}
              </span>
              <span className='text-muted text-[10px]'>Total</span>
            </div>
          </div>
          <div className='flex flex-1 flex-col gap-3'>
            {plans.map((item, index) => (
              <div className='flex items-center gap-3' key={item.name}>
                <span
                  className='size-3 shrink-0 rounded-full'
                  style={{ backgroundColor: colors[index % colors.length] }}
                />
                <div className='flex flex-1 items-center justify-between'>
                  <span className='text-foreground text-sm'>{item.name}</span>
                  <div className='flex items-center gap-2'>
                    <span className='text-foreground text-sm font-semibold'>
                      {item.value}
                    </span>
                    <span className='text-muted text-xs'>
                      ({((item.value / total) * 100).toFixed(1)}%)
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card.Content>
      </Card>
    );
  },
};

export const CustomTooltip: Story = {
  parameters: {
    docs: {
      description: {
        story: 'Custom tooltip on a pie chart with percentage display.',
      },
    },
  },
  render: function Story() {
    const total = browsers.reduce((sum, item) => sum + item.value, 0);
    return (
      <Card className='w-[360px] rounded-2xl'>
        <Card.Header>
          <Card.Title className='text-base'>Market Share</Card.Title>
        </Card.Header>
        <Card.Content className='flex flex-col items-center gap-4'>
          <PieChart height={220}>
            <PieChart.Pie
              cx='50%'
              cy='50%'
              data={browsers}
              dataKey='value'
              nameKey='name'
              outerRadius={90}
            >
              <Cells data={browsers} />
            </PieChart.Pie>
            <PieChart.Tooltip
              content={
                <PieTooltip
                  valueFormatter={(value) =>
                    `${((Number(value) / total) * 100).toFixed(1)}%`
                  }
                />
              }
            />
          </PieChart>
          <Legend data={browsers} />
        </Card.Content>
      </Card>
    );
  },
};

const lastYear = [
  { name: 'Q1', value: 3200 },
  { name: 'Q2', value: 4100 },
  { name: 'Q3', value: 3800 },
  { name: 'Q4', value: 5200 },
];
const thisYear = [
  { name: 'Q1', value: 4800 },
  { name: 'Q2', value: 5600 },
  { name: 'Q3', value: 5100 },
  { name: 'Q4', value: 6800 },
];

export const NestedDonut: Story = {
  parameters: {
    docs: {
      description: {
        story:
          'Nested donut rings — two Pie components at different radii for comparison.',
      },
    },
  },
  render: () => (
    <Card className='w-[400px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>
          Revenue: This Year vs Last
        </Card.Title>
      </Card.Header>
      <Card.Content className='flex flex-col items-center gap-4'>
        <PieChart height={240}>
          <PieChart.Pie
            cornerRadius={12}
            cx='50%'
            cy='50%'
            data={lastYear}
            dataKey='value'
            innerRadius='34%'
            nameKey='name'
            outerRadius='46%'
            paddingAngle={-20}
            strokeWidth={0}
          >
            <Cells data={lastYear} />
          </PieChart.Pie>
          <PieChart.Pie
            cornerRadius={12}
            cx='50%'
            cy='50%'
            data={thisYear}
            dataKey='value'
            innerRadius='56%'
            nameKey='name'
            outerRadius='68%'
            paddingAngle={-20}
            strokeWidth={0}
          >
            <Cells data={thisYear} />
          </PieChart.Pie>
          <PieChart.Tooltip
            content={
              <PieTooltip
                valueFormatter={(value) => `$${Number(value).toLocaleString()}`}
              />
            }
          />
        </PieChart>
        <div className='flex items-center gap-6'>
          <Legend
            data={[
              { name: 'Q1', value: 0 },
              { name: 'Q2', value: 0 },
              { name: 'Q3', value: 0 },
              { name: 'Q4', value: 0 },
            ]}
          />
          <div className='text-muted flex items-center gap-3 text-xs'>
            <span className='flex items-center gap-1.5'>
              <span className='bg-muted/30 size-2.5 rounded-full' />
              Last year (inner)
            </span>
            <span className='flex items-center gap-1.5'>
              <span className='bg-muted size-2.5 rounded-full' />
              This year (outer)
            </span>
          </div>
        </div>
      </Card.Content>
    </Card>
  ),
};
