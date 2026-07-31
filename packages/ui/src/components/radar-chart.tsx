'use client';

import { cn } from '@heroui/react';
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from 'react';
import {
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart as RechartsRadarChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { ChartTooltip } from './chart-tooltip';

export interface RadarChartRootProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  children: ReactNode;
  data: Record<string, number | string>[];
  height?: number;
  ref?: Ref<HTMLDivElement>;
  width?: number | `${number}%`;
}

function RadarChartRoot({
  children,
  className,
  data,
  height = 300,
  ref,
  width = '100%',
  ...props
}: RadarChartRootProps): ReactElement {
  return (
    <div
      ref={ref}
      {...props}
      className={cn('radar-chart', className)}
      data-slot='radar-chart'
    >
      <ResponsiveContainer height={height} width={width}>
        <RechartsRadarChart cx='50%' cy='50%' data={data}>
          {children}
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}

type RadarChartComponent = typeof RadarChartRoot & {
  AngleAxis: typeof PolarAngleAxis;
  Grid: typeof PolarGrid;
  Radar: typeof Radar;
  RadiusAxis: typeof PolarRadiusAxis;
  Root: typeof RadarChartRoot;
  Tooltip: typeof Tooltip;
  TooltipContent: typeof ChartTooltip.Content;
};

export const RadarChart: RadarChartComponent = Object.assign(RadarChartRoot, {
  AngleAxis: PolarAngleAxis,
  Grid: PolarGrid,
  Radar,
  RadiusAxis: PolarRadiusAxis,
  Root: RadarChartRoot,
  Tooltip,
  TooltipContent: ChartTooltip.Content,
});
