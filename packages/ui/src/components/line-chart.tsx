'use client';

import { cn } from '@heroui/react';
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart as RechartsLineChart,
  type Margin,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartTooltip } from './chart-tooltip';

const defaultMargin: Margin = { bottom: 0, left: 0, right: 8, top: 8 };

export interface LineChartRootProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  children: ReactNode;
  data: Record<string, number | string>[];
  height?: number;
  margin?: Margin;
  ref?: Ref<HTMLDivElement>;
  width?: number | `${number}%`;
}

function LineChartRoot({
  children,
  className,
  data,
  height = 300,
  margin = defaultMargin,
  ref,
  width = '100%',
  ...props
}: LineChartRootProps): ReactElement {
  return (
    <div
      ref={ref}
      {...props}
      className={cn('line-chart', className)}
      data-slot='line-chart'
    >
      <ResponsiveContainer height={height} width={width}>
        <RechartsLineChart data={data} margin={margin}>
          {children}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}

type LineChartComponent = typeof LineChartRoot & {
  Grid: typeof CartesianGrid;
  Line: typeof Line;
  Root: typeof LineChartRoot;
  Tooltip: typeof Tooltip;
  TooltipContent: typeof ChartTooltip.Content;
  XAxis: typeof XAxis;
  YAxis: typeof YAxis;
};

export const LineChart: LineChartComponent = Object.assign(LineChartRoot, {
  Grid: CartesianGrid,
  Line,
  Root: LineChartRoot,
  Tooltip,
  TooltipContent: ChartTooltip.Content,
  XAxis,
  YAxis,
});
