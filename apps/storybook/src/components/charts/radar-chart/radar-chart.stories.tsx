import type { Meta, StoryObj } from '@storybook/react';

import { ChartTooltip } from '@/components/charts/chart-tooltip';
import { Card } from '@/components/layout/card';

import { RadarChart } from './index';

const meta = {
  component: RadarChart,
  parameters: { layout: 'padded' },
  tags: ['autodocs'],
  title: 'Components/Charts/RadarChart',
} satisfies Meta<typeof RadarChart>;
export default meta;
type Story = StoryObj<any>;

const skills = [
  { category: 'Design', score: 86 },
  { category: 'Frontend', score: 92 },
  { category: 'Backend', score: 74 },
  { category: 'DevOps', score: 65 },
  { category: 'Testing', score: 78 },
  { category: 'Leadership', score: 70 },
];

const comparison = [
  { category: 'Speed', teamA: 85, teamB: 70 },
  { category: 'Reliability', teamA: 78, teamB: 88 },
  { category: 'Security', teamA: 90, teamB: 75 },
  { category: 'UX', teamA: 72, teamB: 82 },
  { category: 'Performance', teamA: 88, teamB: 68 },
  { category: 'Scalability', teamA: 65, teamB: 80 },
];

const devices = [
  { category: 'Jan', desktop: 65, mobile: 50, tablet: 40 },
  { category: 'Feb', desktop: 72, mobile: 58, tablet: 45 },
  { category: 'Mar', desktop: 80, mobile: 65, tablet: 52 },
  { category: 'Apr', desktop: 78, mobile: 70, tablet: 48 },
  { category: 'May', desktop: 85, mobile: 60, tablet: 55 },
  { category: 'Jun', desktop: 90, mobile: 75, tablet: 60 },
];

function Legend({ items }: { items: Array<{ color: string; label: string }> }) {
  return (
    <div className='flex items-center gap-3'>
      {items.map((item) => (
        <div className='flex items-center gap-1.5' key={item.label}>
          <span
            className='size-3 rounded-full'
            style={{ backgroundColor: item.color }}
          />
          <span className='text-muted text-xs'>{item.label}</span>
        </div>
      ))}
    </div>
  );
}

function DefaultTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const category = payload[0]?.payload?.category;
  return (
    <ChartTooltip>
      {category ? <ChartTooltip.Header>{category}</ChartTooltip.Header> : null}
      {payload.map((item: any) => (
        <ChartTooltip.Item key={String(item.dataKey)}>
          <ChartTooltip.Indicator
            color={item.color ?? item.stroke ?? item.fill}
          />
          <ChartTooltip.Label>{item.name}</ChartTooltip.Label>
          <ChartTooltip.Value>{item.value}</ChartTooltip.Value>
        </ChartTooltip.Item>
      ))}
    </ChartTooltip>
  );
}

export const Default: Story = {
  render: () => (
    <Card className='w-[420px] rounded-2xl'>
      <Card.Header>
        <Card.Title className='text-base'>Skill Assessment</Card.Title>
      </Card.Header>
      <Card.Content className='flex flex-col items-center'>
        <RadarChart data={skills} height={280}>
          <RadarChart.Grid />
          <RadarChart.AngleAxis dataKey='category' />
          <RadarChart.Radar
            dataKey='score'
            dot={{ fill: 'var(--chart-3)', r: 3, strokeWidth: 0 }}
            fill='var(--chart-3)'
            fillOpacity={0.15}
            name='Score'
            stroke='var(--chart-3)'
            strokeWidth={2}
          />
          <RadarChart.Tooltip content={<DefaultTooltip />} />
        </RadarChart>
      </Card.Content>
    </Card>
  ),
};

export const Comparison: Story = {
  render: () => (
    <Card className='w-[460px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Platform Comparison</Card.Title>
        <Legend
          items={[
            { color: 'var(--chart-3)', label: 'Team A' },
            { color: 'var(--chart-1)', label: 'Team B' },
          ]}
        />
      </Card.Header>
      <Card.Content className='flex flex-col items-center'>
        <RadarChart data={comparison} height={300}>
          <RadarChart.Grid />
          <RadarChart.AngleAxis dataKey='category' />
          <RadarChart.Radar
            dataKey='teamA'
            dot={{ fill: 'var(--chart-3)', r: 3, strokeWidth: 0 }}
            fill='var(--chart-3)'
            fillOpacity={0.15}
            name='Team A'
            stroke='var(--chart-3)'
            strokeWidth={2}
          />
          <RadarChart.Radar
            dataKey='teamB'
            dot={{ fill: 'var(--chart-1)', r: 3, strokeWidth: 0 }}
            fill='var(--chart-1)'
            fillOpacity={0.15}
            name='Team B'
            stroke='var(--chart-1)'
            strokeWidth={2}
          />
          <RadarChart.Tooltip content={<RadarChart.TooltipContent />} />
        </RadarChart>
      </Card.Content>
    </Card>
  ),
};

export const MultiSeries: Story = {
  render: () => (
    <Card className='w-[480px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Device Usage</Card.Title>
        <Legend
          items={[
            { color: 'var(--chart-4)', label: 'Desktop' },
            { color: 'var(--chart-3)', label: 'Mobile' },
            { color: 'var(--chart-1)', label: 'Tablet' },
          ]}
        />
      </Card.Header>
      <Card.Content className='flex flex-col items-center'>
        <RadarChart data={devices} height={300}>
          <RadarChart.Grid />
          <RadarChart.AngleAxis dataKey='category' />
          <RadarChart.Radar
            dataKey='desktop'
            dot={false}
            fill='var(--chart-4)'
            fillOpacity={0.1}
            name='Desktop'
            stroke='var(--chart-4)'
            strokeWidth={2}
          />
          <RadarChart.Radar
            dataKey='mobile'
            dot={false}
            fill='var(--chart-3)'
            fillOpacity={0.1}
            name='Mobile'
            stroke='var(--chart-3)'
            strokeWidth={2}
          />
          <RadarChart.Radar
            dataKey='tablet'
            dot={false}
            fill='var(--chart-1)'
            fillOpacity={0.1}
            name='Tablet'
            stroke='var(--chart-1)'
            strokeWidth={2}
          />
          <RadarChart.Tooltip content={<RadarChart.TooltipContent />} />
        </RadarChart>
      </Card.Content>
    </Card>
  ),
};

export const DotsOnly: Story = {
  render: () => (
    <Card className='w-[420px] rounded-2xl'>
      <Card.Header>
        <Card.Title className='text-base'>Performance Metrics</Card.Title>
      </Card.Header>
      <Card.Content className='flex flex-col items-center'>
        <RadarChart data={skills} height={280}>
          <RadarChart.Grid />
          <RadarChart.AngleAxis dataKey='category' />
          <RadarChart.Radar
            dataKey='score'
            dot={{ fill: 'var(--chart-3)', r: 4, strokeWidth: 0 }}
            fill='none'
            name='Score'
            stroke='var(--chart-3)'
            strokeWidth={2}
          />
          <RadarChart.Tooltip content={<RadarChart.TooltipContent />} />
        </RadarChart>
      </Card.Content>
    </Card>
  ),
};

export const WithRadiusAxis: Story = {
  render: () => (
    <Card className='w-[460px] rounded-2xl'>
      <Card.Header className='flex-row items-center justify-between'>
        <Card.Title className='text-base'>Sprint Velocity</Card.Title>
        <Legend
          items={[
            { color: 'var(--chart-4)', label: 'Current' },
            { color: 'var(--chart-1)', label: 'Target' },
          ]}
        />
      </Card.Header>
      <Card.Content className='flex flex-col items-center'>
        <RadarChart data={comparison} height={300}>
          <RadarChart.Grid />
          <RadarChart.AngleAxis dataKey='category' />
          <RadarChart.RadiusAxis angle={90} domain={[0, 100]} />
          <RadarChart.Radar
            dataKey='teamA'
            dot={{ fill: 'var(--chart-4)', r: 3, strokeWidth: 0 }}
            fill='var(--chart-4)'
            fillOpacity={0.15}
            name='Current'
            stroke='var(--chart-4)'
            strokeWidth={2}
          />
          <RadarChart.Radar
            dataKey='teamB'
            dot={{ fill: 'var(--chart-1)', r: 3, strokeWidth: 0 }}
            fill='var(--chart-1)'
            fillOpacity={0.15}
            name='Target'
            stroke='var(--chart-1)'
            strokeWidth={2}
          />
          <RadarChart.Tooltip content={<RadarChart.TooltipContent />} />
        </RadarChart>
      </Card.Content>
    </Card>
  ),
};
