'use client';

import { cn } from '@heroui/react';
import {
  createContext,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
  useContext,
  useMemo,
} from 'react';

export type ChartTooltipIndicatorVariant = 'dot' | 'line';

interface ChartTooltipContextValue {
  indicator: ChartTooltipIndicatorVariant;
}

const ChartTooltipContext = createContext<ChartTooltipContextValue>({
  indicator: 'dot',
});

export interface ChartTooltipRootProps extends HTMLAttributes<HTMLDivElement> {
  active?: boolean;
  indicator?: ChartTooltipIndicatorVariant;
  ref?: Ref<HTMLDivElement>;
}

function ChartTooltipRoot({
  active = true,
  children,
  className,
  indicator = 'dot',
  ref,
  ...props
}: ChartTooltipRootProps): ReactElement | null {
  const contextValue = useMemo(() => ({ indicator }), [indicator]);

  if (!active) return null;

  return (
    <ChartTooltipContext.Provider value={contextValue}>
      <div
        ref={ref}
        {...props}
        className={cn('chart-tooltip', className)}
        data-slot='chart-tooltip'
      >
        {children}
      </div>
    </ChartTooltipContext.Provider>
  );
}

export interface RechartsPayloadEntry {
  color?: string;
  dataKey?: number | string;
  fill?: string;
  name?: number | string;
  payload?: Record<string, unknown>;
  stroke?: string;
  value?: number | string;
}

export interface ChartTooltipContentProps {
  active?: boolean;
  className?: string;
  hideHeader?: boolean;
  indicator?: ChartTooltipIndicatorVariant;
  label?: number | string;
  labelFormatter?: (label: number | string) => ReactNode;
  payload?: RechartsPayloadEntry[];
  valueFormatter?: (value: number | string) => ReactNode;
}

function ChartTooltipContent({
  active,
  className,
  hideHeader = false,
  indicator = 'dot',
  label,
  labelFormatter,
  payload,
  valueFormatter,
}: ChartTooltipContentProps): ReactElement | null {
  if (!active || !payload?.length) return null;
  const resolvedLabel = labelFormatter ? labelFormatter(label ?? '') : label;

  return (
    <ChartTooltipRoot active className={className} indicator={indicator}>
      {!hideHeader && resolvedLabel !== undefined && resolvedLabel !== '' ? (
        <ChartTooltipHeader>{resolvedLabel}</ChartTooltipHeader>
      ) : null}
      {payload.map((entry) => {
        const name = entry.name ?? entry.dataKey ?? '';
        const value = entry.value ?? '';
        const payloadColor =
          typeof entry.payload?.['fill'] === 'string'
            ? entry.payload['fill']
            : undefined;
        const color = entry.stroke ?? entry.color ?? entry.fill ?? payloadColor;

        return (
          <ChartTooltipItem key={String(entry.dataKey ?? name)}>
            <ChartTooltipIndicator {...(color ? { color } : {})} />
            <ChartTooltipLabel>{name}</ChartTooltipLabel>
            <ChartTooltipValue>
              {valueFormatter ? valueFormatter(value) : value}
            </ChartTooltipValue>
          </ChartTooltipItem>
        );
      })}
    </ChartTooltipRoot>
  );
}

export interface ChartTooltipHeaderProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

function ChartTooltipHeader({
  className,
  ref,
  ...props
}: ChartTooltipHeaderProps): ReactElement {
  return (
    <div
      ref={ref}
      {...props}
      className={cn('chart-tooltip__header', className)}
      data-slot='chart-tooltip-header'
    />
  );
}

export interface ChartTooltipItemProps extends HTMLAttributes<HTMLDivElement> {
  ref?: Ref<HTMLDivElement>;
}

function ChartTooltipItem({
  className,
  ref,
  ...props
}: ChartTooltipItemProps): ReactElement {
  return (
    <div
      ref={ref}
      {...props}
      className={cn('chart-tooltip__item', className)}
      data-slot='chart-tooltip-item'
    />
  );
}

export interface ChartTooltipIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  color?: string;
  ref?: Ref<HTMLSpanElement>;
}

function ChartTooltipIndicator({
  className,
  color,
  ref,
  style,
  ...props
}: ChartTooltipIndicatorProps): ReactElement {
  const { indicator } = useContext(ChartTooltipContext);

  return (
    <span
      ref={ref}
      {...props}
      className={cn(
        'chart-tooltip__indicator',
        `chart-tooltip__indicator--${indicator}`,
        className,
      )}
      data-slot='chart-tooltip-indicator'
      style={{ backgroundColor: color, ...style }}
    />
  );
}

export interface ChartTooltipLabelProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>;
}

function ChartTooltipLabel({
  className,
  ref,
  ...props
}: ChartTooltipLabelProps): ReactElement {
  return (
    <span
      ref={ref}
      {...props}
      className={cn('chart-tooltip__label', className)}
      data-slot='chart-tooltip-label'
    />
  );
}

export interface ChartTooltipValueProps extends HTMLAttributes<HTMLSpanElement> {
  ref?: Ref<HTMLSpanElement>;
}

function ChartTooltipValue({
  className,
  ref,
  ...props
}: ChartTooltipValueProps): ReactElement {
  return (
    <span
      ref={ref}
      {...props}
      className={cn('chart-tooltip__value', className)}
      data-slot='chart-tooltip-value'
    />
  );
}

type ChartTooltipComponent = typeof ChartTooltipRoot & {
  Content: typeof ChartTooltipContent;
  Header: typeof ChartTooltipHeader;
  Indicator: typeof ChartTooltipIndicator;
  Item: typeof ChartTooltipItem;
  Label: typeof ChartTooltipLabel;
  Value: typeof ChartTooltipValue;
};

export const ChartTooltip: ChartTooltipComponent = Object.assign(
  ChartTooltipRoot,
  {
    Content: ChartTooltipContent,
    Header: ChartTooltipHeader,
    Indicator: ChartTooltipIndicator,
    Item: ChartTooltipItem,
    Label: ChartTooltipLabel,
    Value: ChartTooltipValue,
  },
);
