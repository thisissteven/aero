'use client';

import { cn } from '@heroui/react';
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from 'react';
import {
  Bar,
  BarChart as RechartsBarChart,
  CartesianGrid,
  type Margin,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartTooltip } from './chart-tooltip';

const defaultMargin: Margin = { bottom: 0, left: 0, right: 8, top: 8 };

export interface BarChartRootProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  children: ReactNode;
  data: Record<string, number | string>[];
  height?: number;
  layout?: 'horizontal' | 'vertical';
  margin?: Margin;
  ref?: Ref<HTMLDivElement>;
  width?: number | `${number}%`;
}

function BarChartRoot({
  children,
  className,
  data,
  height = 300,
  layout,
  margin = defaultMargin,
  ref,
  width = '100%',
  ...props
}: BarChartRootProps): ReactElement {
  return (
    <div
      ref={ref}
      {...props}
      className={cn('bar-chart', className)}
      data-slot='bar-chart'
    >
      <ResponsiveContainer height={height} width={width}>
        <RechartsBarChart
          data={data}
          margin={margin}
          {...(layout ? { layout } : {})}
        >
          {children}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}

type BarChartComponent = typeof BarChartRoot & {
  Bar: typeof Bar;
  Grid: typeof CartesianGrid;
  Root: typeof BarChartRoot;
  Tooltip: typeof Tooltip;
  TooltipContent: typeof ChartTooltip.Content;
  XAxis: typeof XAxis;
  YAxis: typeof YAxis;
};

export const BarChart: BarChartComponent = Object.assign(BarChartRoot, {
  Bar,
  Grid: CartesianGrid,
  Root: BarChartRoot,
  Tooltip,
  TooltipContent: ChartTooltip.Content,
  XAxis,
  YAxis,
});
