'use client';

import { cn } from '@heroui/react';
import type { HTMLAttributes, ReactElement, ReactNode, Ref } from 'react';
import {
  Cell,
  Label,
  Pie,
  PieChart as RechartsPieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';

import { ChartTooltip } from './chart-tooltip';

export interface PieChartRootProps extends Omit<
  HTMLAttributes<HTMLDivElement>,
  'children'
> {
  children: ReactNode;
  height?: number;
  ref?: Ref<HTMLDivElement>;
  width?: number | `${number}%`;
}

function PieChartRoot({
  children,
  className,
  height = 300,
  ref,
  width = '100%',
  ...props
}: PieChartRootProps): ReactElement {
  return (
    <div
      ref={ref}
      {...props}
      className={cn('pie-chart', className)}
      data-slot='pie-chart'
    >
      <ResponsiveContainer height={height} width={width}>
        <RechartsPieChart>{children}</RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}

type PieChartComponent = typeof PieChartRoot & {
  Cell: typeof Cell;
  Label: typeof Label;
  Pie: typeof Pie;
  Root: typeof PieChartRoot;
  Tooltip: typeof Tooltip;
  TooltipContent: typeof ChartTooltip.Content;
};

export const PieChart: PieChartComponent = Object.assign(PieChartRoot, {
  Cell,
  Label,
  Pie,
  Root: PieChartRoot,
  Tooltip,
  TooltipContent: ChartTooltip.Content,
});
