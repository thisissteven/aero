'use client';

import { cn } from '@heroui/react';
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from 'react';
import {
  Area,
  AreaChart as RechartsAreaChart,
  CartesianGrid,
  type Margin,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import { ChartTooltip } from './chart-tooltip';

const defaultMargin: Margin = { bottom: 0, left: 0, right: 8, top: 8 };

export interface AreaChartRootProps extends Omit<
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

function AreaChartRoot({
  children,
  className,
  data,
  height = 300,
  margin = defaultMargin,
  ref,
  width = '100%',
  ...props
}: AreaChartRootProps): ReactElement {
  return (
    <div
      ref={ref}
      {...props}
      className={cn('area-chart', className)}
      data-slot='area-chart'
    >
      <ResponsiveContainer height={height} width={width}>
        <RechartsAreaChart data={data} margin={margin}>
          {children}
        </RechartsAreaChart>
      </ResponsiveContainer>
    </div>
  );
}

type AreaChartComponent = typeof AreaChartRoot & {
  Area: typeof Area;
  Grid: typeof CartesianGrid;
  Root: typeof AreaChartRoot;
  Tooltip: typeof Tooltip;
  TooltipContent: typeof ChartTooltip.Content;
  XAxis: typeof XAxis;
  YAxis: typeof YAxis;
};

export const AreaChart: AreaChartComponent = Object.assign(AreaChartRoot, {
  Area,
  Grid: CartesianGrid,
  Root: AreaChartRoot,
  Tooltip,
  TooltipContent: ChartTooltip.Content,
  XAxis,
  YAxis,
});
