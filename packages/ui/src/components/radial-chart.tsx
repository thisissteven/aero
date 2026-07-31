'use client';

import { cn } from '@heroui/react';
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from 'react';
import {
  Cell,
  PolarAngleAxis,
  RadialBar,
  RadialBarChart as RechartsRadialBarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { ChartTooltip } from './chart-tooltip';

export interface RadialChartRootProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  barSize?: number;
  children: ReactNode;
  data: Record<string, number | string>[];
  endAngle?: number;
  height?: number;
  innerRadius?: number | string;
  outerRadius?: number | string;
  ref?: Ref<HTMLDivElement>;
  startAngle?: number;
  width?: number | `${number}%`;
}

function RadialChartRoot({
  barSize = 10,
  children,
  className,
  data,
  endAngle = -270,
  height = 300,
  innerRadius = '30%',
  outerRadius = '80%',
  ref,
  startAngle = 90,
  width = '100%',
  ...props
}: RadialChartRootProps): ReactElement {
  return (
    <div
      ref={ref}
      {...props}
      className={cn('radial-chart', className)}
      data-slot='radial-chart'
    >
      <ResponsiveContainer height={height} width={width}>
        <RechartsRadialBarChart
          barSize={barSize}
          cx='50%'
          cy='50%'
          data={data}
          endAngle={endAngle}
          innerRadius={innerRadius}
          outerRadius={outerRadius}
          startAngle={startAngle}
        >
          {children}
        </RechartsRadialBarChart>
      </ResponsiveContainer>
    </div>
  );
}

type RadialChartComponent = typeof RadialChartRoot & {
  AngleAxis: typeof PolarAngleAxis;
  Bar: typeof RadialBar;
  Cell: typeof Cell;
  Root: typeof RadialChartRoot;
  Tooltip: typeof Tooltip;
  TooltipContent: typeof ChartTooltip.Content;
};

export const RadialChart: RadialChartComponent = Object.assign(
  RadialChartRoot,
  {
    AngleAxis: PolarAngleAxis,
    Bar: RadialBar,
    Cell,
    Root: RadialChartRoot,
    Tooltip,
    TooltipContent: ChartTooltip.Content,
  },
);
