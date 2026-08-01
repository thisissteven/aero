import type { Meta, StoryObj } from '@storybook/react';

import { AreaChart } from '@aero/ui/area-chart';
import { BarChart } from '@aero/ui/bar-chart';
import { KPI } from '@aero/ui/kpi';
import { KPIGroup } from '@aero/ui/kpi-group';
import { LineChart } from '@aero/ui/line-chart';
import { PieChart } from '@aero/ui/pie-chart';
import { ProgressCircle } from '@aero/ui/progress-circle';
import { Table } from '@aero/ui/table';
import { TrendChip } from '@aero/ui/trend-chip';

import { Widget } from './index';

const meta = {
  component: Widget,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Data Display/Widget',
} satisfies Meta<typeof Widget>;
export default meta;
type Story = StoryObj<any>;
const months = [
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
];
const revenue = months.map((month, index) => ({
  month,
  revenue: [
    4200, 5800, 4900, 7200, 6100, 8400, 7800, 9200, 8600, 10200, 9800, 11500,
  ][index],
}));
const traffic = months.map((month, index) => ({
  month,
  organic: [
    2000, 15000, 8000, 14000, 15000, 8000, 18000, 18000, 20000, 17000, 22000,
    15000,
  ][index],
  paidAds: [
    1000, 10000, 12000, 14000, 8000, 9000, 12000, 10000, 5000, 12000, 18000,
    9000,
  ][index],
}));
const requests = Array.from({ length: 30 }, (_, index) => ({
  date: `2025-09-${String(index + 1).padStart(2, '0')}`,
  requests: [
    680, 1150, 1470, 1130, 560, 470, 960, 1200, 1120, 1060, 780, 930, 950, 1050,
    1740, 940, 1570, 1250, 930, 1280, 1180, 1320, 950, 980, 680, 510, 960, 860,
    630, 380,
  ][index],
}));
const sparksUp = [
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
const sparksDown = sparksUp.toReversed();

export const Default: Story = {
  render: () => (
    <Widget className='w-full max-w-[520px]'>
      <Widget.Header>
        <Widget.Title>Tokens Over Time</Widget.Title>
        <Widget.Legend>
          <Widget.LegendItem color='var(--chart-4)'>Input</Widget.LegendItem>
          <Widget.LegendItem color='var(--chart-1)'>Output</Widget.LegendItem>
        </Widget.Legend>
      </Widget.Header>
      <Widget.Content>
        <LineChart
          data={requests.map((item, index) => ({
            date: item.date,
            input: item.requests * 80,
            output: item.requests * (25 + (index % 4)),
          }))}
          height={220}
        >
          <LineChart.Grid vertical={false} />
          <LineChart.XAxis
            dataKey='date'
            tickFormatter={(value) =>
              new Date(value).toLocaleDateString('en-US', {
                day: '2-digit',
                month: '2-digit',
              })
            }
            tickMargin={8}
          />
          <LineChart.YAxis
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
            }
            width={40}
          />
          <LineChart.Tooltip content={<LineChart.TooltipContent />} />
          <LineChart.Line
            dataKey='input'
            dot={false}
            name='Input'
            stroke='var(--chart-4)'
            strokeWidth={2}
            type='monotone'
          />
          <LineChart.Line
            dataKey='output'
            dot={false}
            name='Output'
            stroke='var(--chart-1)'
            strokeWidth={2}
            type='monotone'
          />
        </LineChart>
      </Widget.Content>
    </Widget>
  ),
};
export const WithBarChart: Story = {
  render: () => (
    <Widget className='w-full max-w-[520px]'>
      <Widget.Header>
        <Widget.Title>Requests Over Time</Widget.Title>
        <Widget.Legend>
          <Widget.LegendItem color='var(--chart-3)'>Requests</Widget.LegendItem>
        </Widget.Legend>
      </Widget.Header>
      <Widget.Content>
        <BarChart data={requests} height={220}>
          <BarChart.Grid vertical={false} />
          <BarChart.XAxis
            dataKey='date'
            tickFormatter={(value) =>
              new Date(value).toLocaleDateString('en-US', {
                day: '2-digit',
                month: '2-digit',
              })
            }
            tickMargin={8}
          />
          <BarChart.YAxis width={40} />
          <BarChart.Tooltip content={<BarChart.TooltipContent />} />
          <BarChart.Bar
            dataKey='requests'
            fill='var(--chart-3)'
            radius={[2, 2, 0, 0]}
          />
        </BarChart>
      </Widget.Content>
    </Widget>
  ),
};
export const WithLineChart: Story = {
  render: () => (
    <Widget className='w-full max-w-[520px]'>
      <Widget.Header>
        <Widget.Title>Traffic Sources</Widget.Title>
        <Widget.Legend>
          <Widget.LegendItem color='var(--chart-3)'>Organic</Widget.LegendItem>
          <Widget.LegendItem color='var(--chart-1)'>Paid Ads</Widget.LegendItem>
        </Widget.Legend>
      </Widget.Header>
      <Widget.Content>
        <LineChart data={traffic} height={200}>
          <LineChart.Grid vertical={false} />
          <LineChart.XAxis dataKey='month' tickMargin={8} />
          <LineChart.YAxis
            tickFormatter={(value) =>
              value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
            }
            width={30}
          />
          <LineChart.Tooltip content={<LineChart.TooltipContent />} />
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
            stroke='var(--chart-1)'
            strokeWidth={2}
            type='monotone'
          />
        </LineChart>
      </Widget.Content>
    </Widget>
  ),
};
const browsers = [
  { name: 'Chrome', value: 62 },
  { name: 'Safari', value: 19 },
  { name: 'Firefox', value: 10 },
  { name: 'Edge', value: 9 },
];
const colors = [
  'var(--chart-4)',
  'var(--chart-3)',
  'var(--chart-2)',
  'var(--chart-1)',
];
export const WithPieChart: Story = {
  render: () => (
    <Widget className='w-full max-w-[360px]'>
      <Widget.Header>
        <Widget.Title>Browser Usage</Widget.Title>
      </Widget.Header>
      <Widget.Content className='flex flex-col items-center gap-4'>
        <PieChart height={200}>
          <PieChart.Tooltip content={<PieChart.TooltipContent />} />
          <PieChart.Pie
            cx='50%'
            cy='50%'
            data={browsers}
            dataKey='value'
            nameKey='name'
            outerRadius={80}
          >
            {browsers.map((item, index) => (
              <PieChart.Cell fill={colors[index]} key={item.name} />
            ))}
          </PieChart.Pie>
        </PieChart>
        <Widget.Legend className='flex-wrap justify-center'>
          {browsers.map((item, index) => (
            <Widget.LegendItem color={colors[index]} key={item.name}>
              {item.name}
            </Widget.LegendItem>
          ))}
        </Widget.Legend>
      </Widget.Content>
    </Widget>
  ),
};

function SparkMetric({
  change,
  color,
  data,
  suffix,
  title,
  trend,
  value,
}: {
  change: string;
  color: string;
  data: { value: number }[];
  suffix: string;
  title: string;
  trend: 'down' | 'up';
  value: React.ReactNode;
}) {
  return (
    <KPI>
      <KPI.Header>
        <KPI.Title>{title}</KPI.Title>
      </KPI.Header>
      <KPI.Content className='grid-cols-[1fr_1fr] items-end'>
        <div className='flex flex-col gap-1'>
          {value}
          <TrendChip trend={trend} variant='tertiary'>
            {change}
            <TrendChip.Suffix>{suffix}</TrendChip.Suffix>
          </TrendChip>
        </div>
        <KPI.Chart color={color} data={data} height={60} strokeWidth={1.5} />
      </KPI.Content>
    </KPI>
  );
}
export const WithKPIs: Story = {
  name: 'With KPIs',
  render: () => (
    <Widget className='w-full max-w-[900px]'>
      <Widget.Header>
        <Widget.Title>Key Metrics</Widget.Title>
        <Widget.Description>Last 30 days</Widget.Description>
      </Widget.Header>
      <Widget.Content>
        <KPIGroup className='bg-transparent shadow-none'>
          <SparkMetric
            change='3.3%'
            color='var(--color-accent)'
            data={sparksUp}
            suffix='last 30d'
            title='Total Revenue'
            trend='up'
            value={
              <KPI.Value
                className='text-3xl'
                currency='USD'
                maximumFractionDigits={0}
                style='currency'
                value={228451}
              />
            }
          />
          <KPIGroup.Separator />
          <SparkMetric
            change='5.9%'
            color='var(--color-danger)'
            data={sparksDown}
            suffix='vs last 7d'
            title='Bounce Rate'
            trend='down'
            value={
              <KPI.Value
                className='text-3xl'
                maximumFractionDigits={1}
                style='percent'
                value={0.423}
              />
            }
          />
          <KPIGroup.Separator />
          <SparkMetric
            change='10.9%'
            color='var(--color-success)'
            data={sparksUp}
            suffix='this month'
            title='Active Users'
            trend='up'
            value={
              <KPI.Value
                className='text-3xl'
                maximumFractionDigits={0}
                notation='compact'
                value={97859}
              />
            }
          />
        </KPIGroup>
      </Widget.Content>
    </Widget>
  ),
};
const members = [
  { email: 'kate@acme.com', name: 'Kate Moore', role: 'CEO', status: 'Active' },
  { email: 'john@acme.com', name: 'John Smith', role: 'CTO', status: 'Active' },
  {
    email: 'sara@acme.com',
    name: 'Sara Johnson',
    role: 'CMO',
    status: 'On Leave',
  },
  {
    email: 'michael@acme.com',
    name: 'Michael Brown',
    role: 'CFO',
    status: 'Active',
  },
];
export const WithTable: Story = {
  render: () => (
    <Widget className='w-full max-w-[640px]'>
      <Widget.Header>
        <Widget.Title>Team Members</Widget.Title>
        <Widget.Description>4 members</Widget.Description>
      </Widget.Header>
      <Widget.Content className='p-0'>
        <Table variant='secondary'>
          <Table.ScrollContainer>
            <Table.Content aria-label='Team members'>
              <Table.Header className='sr-only'>
                <Table.Column isRowHeader>Name</Table.Column>
                <Table.Column>Role</Table.Column>
                <Table.Column>Status</Table.Column>
                <Table.Column>Email</Table.Column>
              </Table.Header>
              <Table.Body>
                {members.map((member, index) => (
                  <Table.Row
                    className={
                      index === members.length - 1 ? '[&_td]:border-b-0' : ''
                    }
                    key={member.email}
                  >
                    <Table.Cell>{member.name}</Table.Cell>
                    <Table.Cell>{member.role}</Table.Cell>
                    <Table.Cell>{member.status}</Table.Cell>
                    <Table.Cell>{member.email}</Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Widget.Content>
    </Widget>
  ),
};
const usage = [
  {
    amount: '33.1K',
    color: 'default',
    label: 'Total API Requests',
    progress: 33,
  },
  { amount: '98.2M', color: 'accent', label: 'Input Tokens', progress: 62 },
  { amount: '59M', color: 'accent', label: 'Output Tokens', progress: 37 },
  { amount: '$149.61', color: 'accent', label: 'Total Spend', progress: 75 },
] as const;
export const UsageSummary: Story = {
  render: () => (
    <Widget className='w-full max-w-[520px]'>
      <div className='grid grid-cols-[5fr_2fr] items-center px-5 py-2'>
        <span className='text-muted text-xs font-medium'>Usage Type</span>
        <span className='text-muted text-xs font-medium'>Amount</span>
      </div>
      <Widget.Content className='flex flex-col gap-0 p-0'>
        <Table variant='secondary'>
          <Table.ScrollContainer>
            <Table.Content aria-label='Usage summary'>
              <Table.Header className='sr-only'>
                <Table.Column isRowHeader className='bg-transparent'>
                  Usage Type
                </Table.Column>
                <Table.Column className='bg-transparent'>Amount</Table.Column>
              </Table.Header>
              <Table.Body>
                {usage.map((item, index) => (
                  <Table.Row
                    className={
                      index === usage.length - 1 ? '[&_td]:border-b-0' : ''
                    }
                    key={item.label}
                  >
                    <Table.Cell>
                      <div className='flex items-center gap-3'>
                        <ProgressCircle
                          aria-label={`${item.label} usage`}
                          color={item.color}
                          size='sm'
                          value={item.progress}
                        >
                          <ProgressCircle.Track>
                            <ProgressCircle.TrackCircle />
                            <ProgressCircle.FillCircle />
                          </ProgressCircle.Track>
                        </ProgressCircle>
                        <span className='text-foreground text-sm font-medium'>
                          {item.label}
                        </span>
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <span className='text-foreground text-sm font-semibold'>
                        {item.amount}
                      </span>
                    </Table.Cell>
                  </Table.Row>
                ))}
              </Table.Body>
            </Table.Content>
          </Table.ScrollContainer>
        </Table>
      </Widget.Content>
    </Widget>
  ),
};
export const DashboardGrid: Story = {
  render: () => (
    <div className='grid w-full max-w-[960px] grid-cols-1 gap-3 md:grid-cols-2'>
      <Widget className='md:col-span-2'>
        <Widget.Header>
          <Widget.Title>Overview</Widget.Title>
        </Widget.Header>
        <Widget.Content className='grid grid-cols-2 gap-4 md:grid-cols-4'>
          {[
            { title: 'Revenue', value: '$228K', trend: 'up', change: '12.5%' },
            { title: 'Orders', value: '1,234', trend: 'up', change: '8.2%' },
            { title: 'Customers', value: '8,921', trend: 'up', change: '3.1%' },
            {
              title: 'Conversion',
              value: '3.2%',
              trend: 'down',
              change: '0.4%',
            },
          ].map((item) => (
            <div className='flex flex-col gap-1' key={item.title}>
              <span className='text-muted text-xs'>{item.title}</span>
              <div className='flex items-center gap-2'>
                <span className='text-foreground text-xl font-semibold'>
                  {item.value}
                </span>
                <TrendChip trend={item.trend as 'down' | 'up'} variant='soft'>
                  {item.change}
                </TrendChip>
              </div>
            </div>
          ))}
        </Widget.Content>
      </Widget>
      <Widget>
        <Widget.Header>
          <Widget.Title>Revenue</Widget.Title>
          <TrendChip trend='up' variant='tertiary'>
            12.5%
          </TrendChip>
        </Widget.Header>
        <Widget.Content>
          <AreaChart data={revenue} height={180}>
            <defs>
              <linearGradient id='dash-revenue' x1='0' x2='0' y1='0' y2='1'>
                <stop
                  offset='0%'
                  stopColor='var(--chart-3)'
                  stopOpacity={0.2}
                />
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
              tickFormatter={(value) => `$${(value / 1000).toFixed(0)}k`}
              width={40}
            />
            <AreaChart.Area
              dataKey='revenue'
              dot={false}
              fill='url(#dash-revenue)'
              stroke='var(--chart-3)'
              strokeWidth={2}
              type='monotone'
            />
            <AreaChart.Tooltip content={<AreaChart.TooltipContent />} />
          </AreaChart>
        </Widget.Content>
      </Widget>
      <Widget>
        <Widget.Header>
          <Widget.Title>Traffic</Widget.Title>
          <Widget.Legend>
            <Widget.LegendItem color='var(--chart-3)'>
              Organic
            </Widget.LegendItem>
            <Widget.LegendItem color='var(--chart-1)'>Paid</Widget.LegendItem>
          </Widget.Legend>
        </Widget.Header>
        <Widget.Content>
          <LineChart data={traffic.slice(0, 6)} height={180}>
            <LineChart.Grid vertical={false} />
            <LineChart.XAxis dataKey='month' tickMargin={8} />
            <LineChart.YAxis
              tickFormatter={(value) =>
                value >= 1000 ? `${(value / 1000).toFixed(0)}k` : `${value}`
              }
              width={30}
            />
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
              name='Paid'
              stroke='var(--chart-1)'
              strokeWidth={2}
              type='monotone'
            />
            <LineChart.Tooltip content={<LineChart.TooltipContent />} />
          </LineChart>
        </Widget.Content>
      </Widget>
      <Widget className='md:col-span-2'>
        <Widget.Header>
          <Widget.Title>Monthly Sales</Widget.Title>
          <Widget.Description>Units sold — Jan to Dec 2025</Widget.Description>
        </Widget.Header>
        <Widget.Content>
          <BarChart
            data={months.map((month, index) => ({
              month,
              sales: [18, 32, 28, 45, 38, 52, 42, 55, 48, 60, 53, 58][index],
            }))}
            height={180}
          >
            <BarChart.Grid vertical={false} />
            <BarChart.XAxis dataKey='month' tickMargin={8} />
            <BarChart.YAxis width={30} />
            <BarChart.Bar
              barSize={20}
              dataKey='sales'
              fill='var(--accent)'
              name='Sales'
              radius={[24, 24, 24, 24]}
            />
            <BarChart.Tooltip
              content={
                <BarChart.TooltipContent
                  valueFormatter={(value) => `${value} units`}
                />
              }
            />
          </BarChart>
        </Widget.Content>
      </Widget>
    </div>
  ),
};
