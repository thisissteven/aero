import type { Meta, StoryObj } from '@storybook/react';
import type { ReactNode } from 'react';

import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { Card } from '@/components/layout/card';

import { RadialChart } from './index';

const meta = {
  component: RadialChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Charts/RadialChart',
} satisfies Meta<typeof RadialChart>;
export default meta;
type Story = StoryObj<typeof meta>;

interface RadialTooltipProps {
  payload?: Array<{
    fill?: string;
    name?: string;
    payload?: { fill?: string; name?: string; value?: number | string };
    value?: number | string;
  }>;
  valueFormatter?: (value: number | string) => ReactNode;
}

function RadialTooltip({ payload, valueFormatter }: RadialTooltipProps) {
  const item = payload?.[0];
  if (!item?.payload) return null;
  const name = item.payload.name ?? item.name;
  const value = item.payload.value ?? item.value;
  const fill = item.payload.fill;
  return (
    <ChartTooltip>
      <ChartTooltip.Item>
        <ChartTooltip.Indicator color={fill} />
        <ChartTooltip.Label>{name}</ChartTooltip.Label>
        <ChartTooltip.Value>
          {valueFormatter && value != null ? valueFormatter(value) : value}
        </ChartTooltip.Value>
      </ChartTooltip.Item>
    </ChartTooltip>
  );
}

const activity = [
  {
    fill: 'var(--chart-4)',
    name: 'Calories',
    value: 200,
    valueText: '1,623/2,000 kcal',
  },
  {
    fill: 'var(--chart-3)',
    name: 'Steps',
    value: 350,
    valueText: '8,328/10,000 steps',
  },
  {
    fill: 'var(--chart-2)',
    name: 'Exercise',
    value: 250,
    valueText: '25/120 min',
  },
];

export const Default: Story = {
  render: () => (
    <Card className='w-[380px] rounded-2xl'>
      <Card.Header>
        <Card.Title className='text-base'>Energy Activity</Card.Title>
      </Card.Header>
      <Card.Content className='flex items-center gap-4'>
        <div className='flex flex-1 flex-col gap-2 self-start'>
          {activity.map((item) => (
            <div className='flex flex-col' key={item.name}>
              <span className='text-muted text-xs'>{item.name}</span>
              <span className='text-foreground text-sm font-semibold'>
                {item.valueText}
              </span>
            </div>
          ))}
        </div>
        <div className='relative shrink-0'>
          <RadialChart
            data={activity}
            height={200}
            innerRadius='40%'
            outerRadius='100%'
            width={200}
          >
            <RadialChart.Bar background cornerRadius={12} dataKey='value' />
            <RadialChart.Tooltip content={<RadialTooltip />} />
          </RadialChart>
          <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
            <span className='text-muted text-[10px]'>Calories</span>
            <span className='text-foreground text-sm font-semibold'>
              700 kcal
            </span>
          </div>
        </div>
      </Card.Content>
    </Card>
  ),
};

export const Gauge: Story = {
  render: function Story() {
    const data = [{ fill: 'var(--chart-3)', name: 'Active Users', value: 780 }];
    return (
      <Card className='w-[280px] rounded-2xl'>
        <Card.Header>
          <Card.Title className='text-base'>Activity</Card.Title>
        </Card.Header>
        <Card.Content className='flex flex-col items-center'>
          <div className='relative'>
            <RadialChart
              barSize={10}
              data={data}
              endAngle={-45}
              height={200}
              innerRadius='70%'
              outerRadius='90%'
              startAngle={225}
              width={200}
            >
              <RadialChart.AngleAxis
                angleAxisId={0}
                domain={[0, 1358]}
                tick={false}
                type='number'
              />
              <RadialChart.Bar
                background
                angleAxisId={0}
                cornerRadius={12}
                dataKey='value'
              />
              <RadialChart.Tooltip content={<RadialTooltip />} />
            </RadialChart>
            <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
              <span className='text-muted text-xs'>Active Users</span>
              <span className='text-foreground text-xl font-bold'>
                {(1358).toLocaleString()}
              </span>
            </div>
          </div>
        </Card.Content>
      </Card>
    );
  },
};

const storage = [
  { fill: 'var(--chart-4)', name: 'Documents', value: 42 },
  { fill: 'var(--chart-3)', name: 'Media', value: 28 },
  { fill: 'var(--chart-2)', name: 'System', value: 18 },
];

export const WithLegend: Story = {
  render: () => (
    <Card className='w-[400px] rounded-2xl'>
      <Card.Header>
        <Card.Title className='text-base'>Storage Breakdown</Card.Title>
        <Card.Description className='text-muted text-xs'>
          88 GB of 128 GB used
        </Card.Description>
      </Card.Header>
      <Card.Content className='flex items-center gap-6'>
        <div className='relative shrink-0'>
          <RadialChart
            data={storage}
            height={180}
            innerRadius='40%'
            outerRadius='100%'
            width={180}
          >
            <RadialChart.Bar background cornerRadius={12} dataKey='value' />
            <RadialChart.Tooltip
              content={
                <RadialTooltip valueFormatter={(value) => `${value} GB`} />
              }
            />
          </RadialChart>
          <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
            <span className='text-foreground text-xl font-bold'>88</span>
            <span className='text-muted text-xs'>GB used</span>
          </div>
        </div>
        <div className='flex flex-1 flex-col gap-3'>
          {storage.map((item) => (
            <div className='flex items-center gap-3' key={item.name}>
              <span
                className='size-3 shrink-0 rounded-full'
                style={{ backgroundColor: item.fill }}
              />
              <div className='flex flex-1 items-center justify-between'>
                <span className='text-foreground text-sm'>{item.name}</span>
                <span className='text-foreground text-sm font-semibold'>
                  {item.value} GB
                </span>
              </div>
            </div>
          ))}
        </div>
      </Card.Content>
    </Card>
  ),
};

const gauges = [
  {
    color: 'var(--chart-4)',
    label: 'Conversion',
    max: 1000,
    value: 750,
  },
  {
    color: 'var(--chart-3)',
    label: 'Engagement',
    max: 4200,
    value: 3150,
  },
  { color: 'var(--chart-2)', label: 'Bounce Rate', max: 100, value: 35 },
  {
    color: 'var(--color-danger)',
    label: 'Errors',
    max: 500,
    value: 450,
  },
];

export const GaugeGrid: Story = {
  render: () => (
    <div className='grid w-[640px] grid-cols-2 gap-3 lg:grid-cols-4'>
      {gauges.map((gauge) => {
        const data = [
          { fill: gauge.color, name: gauge.label, value: gauge.value },
        ];
        const percent = ((gauge.value / gauge.max) * 100).toFixed(0);
        return (
          <Card className='rounded-2xl' key={gauge.label}>
            <Card.Header className='pb-0'>
              <Card.Title className='text-muted text-xs font-medium'>
                {gauge.label}
              </Card.Title>
            </Card.Header>
            <Card.Content className='flex flex-col items-center'>
              <div className='relative'>
                <RadialChart
                  barSize={8}
                  data={data}
                  endAngle={-45}
                  height={120}
                  innerRadius='70%'
                  outerRadius='90%'
                  startAngle={225}
                  width={120}
                >
                  <RadialChart.AngleAxis
                    angleAxisId={0}
                    domain={[0, gauge.max]}
                    tick={false}
                    type='number'
                  />
                  <RadialChart.Bar
                    background
                    angleAxisId={0}
                    cornerRadius={12}
                    dataKey='value'
                  />
                  <RadialChart.Tooltip content={<RadialTooltip />} />
                </RadialChart>
                <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
                  <span className='text-foreground text-lg font-bold'>
                    {percent}%
                  </span>
                </div>
              </div>
            </Card.Content>
          </Card>
        );
      })}
    </div>
  ),
};

export const ProgressRing: Story = {
  render: function Story() {
    const value = 7452;
    const max = 10000;
    const percent = ((value / max) * 100).toFixed(0);
    const data = [{ fill: 'var(--chart-3)', name: 'Steps', value }];
    return (
      <Card className='w-[300px] rounded-2xl'>
        <Card.Header>
          <Card.Title className='text-base'>Daily Steps</Card.Title>
        </Card.Header>
        <Card.Content className='flex flex-col items-center gap-3'>
          <div className='relative'>
            <RadialChart
              barSize={12}
              data={data}
              height={200}
              innerRadius='86%'
              outerRadius='100%'
              width={200}
            >
              <RadialChart.AngleAxis
                angleAxisId={0}
                domain={[0, max]}
                tick={false}
                type='number'
              />
              <RadialChart.Bar
                background
                angleAxisId={0}
                cornerRadius={12}
                dataKey='value'
              />
              <RadialChart.Tooltip
                content={
                  <RadialTooltip
                    valueFormatter={(item) => Number(item).toLocaleString()}
                  />
                }
              />
            </RadialChart>
            <div className='pointer-events-none absolute inset-0 flex flex-col items-center justify-center'>
              <span className='text-foreground text-3xl font-bold'>
                {percent}%
              </span>
              <span className='text-muted text-xs'>
                {value.toLocaleString()} / {max.toLocaleString()}
              </span>
            </div>
          </div>
        </Card.Content>
      </Card>
    );
  },
};
