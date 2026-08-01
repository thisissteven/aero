import type { Meta, StoryObj } from '@storybook/react';
import { Fragment } from 'react';

import { KPI } from '@aero/ui/kpi';

import { KPIGroup } from './index';

const meta = {
  component: KPIGroup,
  parameters: { layout: 'centered' },
  tags: ['autodocs'],
  title: 'Components/Data Display/KPIGroup',
} satisfies Meta<typeof KPIGroup>;
export default meta;
type Story = StoryObj<any>;
const horizontal = [
  {
    title: 'Total Subscribers',
    value: 71897,
    digits: 0,
    trend: 'up',
    change: '12%',
  },
  {
    title: 'Avg. Open Rate',
    value: 0.5816,
    digits: 2,
    trend: 'up',
    change: '2.02%',
  },
  {
    title: 'Avg. Click Rate',
    value: 0.2457,
    digits: 2,
    trend: 'down',
    change: '4.05%',
  },
] as const;
function Metric({
  change,
  currency,
  digits,
  from,
  title,
  trend,
  value,
}: {
  change: string;
  currency?: boolean;
  digits: number;
  from?: string;
  title: string;
  trend: 'down' | 'up';
  value: number;
}) {
  return (
    <KPI>
      <KPI.Header>
        <KPI.Title>{title}</KPI.Title>
      </KPI.Header>
      <KPI.Content>
        {from ? (
          <div className='flex items-baseline gap-2'>
            <KPI.Value
              {...(currency
                ? { currency: 'USD', style: 'currency' as const }
                : title.includes('Rate')
                  ? { style: 'percent' as const }
                  : {})}
              maximumFractionDigits={digits}
              value={value}
            />
            <span className='text-muted text-sm'>from {from}</span>
          </div>
        ) : (
          <KPI.Value
            {...(currency
              ? { currency: 'USD', style: 'currency' as const }
              : title.includes('Rate')
                ? { style: 'percent' as const }
                : {})}
            maximumFractionDigits={digits}
            value={value}
          />
        )}
        <KPI.Trend trend={trend}>{change}</KPI.Trend>
      </KPI.Content>
    </KPI>
  );
}
function WithSeparators({ children }: { children: React.ReactNode[] }) {
  return (
    <>
      {children.map((child, index) => (
        <Fragment key={index}>
          {index > 0 && <KPIGroup.Separator />}
          {child}
        </Fragment>
      ))}
    </>
  );
}

export const Horizontal: Story = {
  render: () => (
    <div className='w-[900px] rounded-2xl p-6'>
      <KPIGroup>
        <WithSeparators>
          {horizontal.map((metric) => (
            <Metric {...metric} key={metric.title} />
          ))}
        </WithSeparators>
      </KPIGroup>
    </div>
  ),
};
export const WithFromSuffix: Story = {
  render: () => (
    <div className='w-[900px] rounded-2xl p-6'>
      <KPIGroup>
        <WithSeparators>
          {horizontal.map((metric, index) => (
            <Metric
              {...metric}
              from={['70,946', '56.14%', '28.62%'][index]}
              key={metric.title}
            />
          ))}
        </WithSeparators>
      </KPIGroup>
    </div>
  ),
};
export const Vertical: Story = {
  render: () => (
    <div className='flex w-[400px] items-center justify-center rounded-2xl p-6'>
      <KPIGroup orientation='vertical'>
        <WithSeparators>
          {[
            { title: 'Revenue', value: 228451, trend: 'up', change: '+3.3%' },
            { title: 'Expenses', value: 25108, trend: 'down', change: '-3.3%' },
            { title: 'Profit', value: 203133, trend: 'up', change: '+4.1%' },
          ].map((metric) => (
            <Metric {...metric} currency digits={0} key={metric.title} />
          ))}
        </WithSeparators>
      </KPIGroup>
    </div>
  ),
};
