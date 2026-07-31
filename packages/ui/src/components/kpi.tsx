'use client';

import { Button, Card, cn, ProgressBar, Separator } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { createContext, useContext, useId } from 'react';
import { Area, AreaChart, ResponsiveContainer } from 'recharts';

import { NumberValue, type NumberValueRootProps } from './number-value';
import { TrendChip, type TrendChipRootProps } from './trend-chip';

const Context = createContext(true);
const useKpi = () => useContext(Context);
const part = (name: string, className?: string) =>
  cn(`kpi__${name}`, className);
type Status = 'danger' | 'success' | 'warning';

export interface KPIRootProps extends ComponentPropsWithRef<typeof Card> {
  children: ReactNode;
}
function KPIRoot({
  children,
  className,
  ...props
}: KPIRootProps): ReactElement {
  return (
    <Context value>
      <Card
        {...props}
        className={cn('kpi', className) ?? 'kpi'}
        data-slot='kpi'
      >
        {children}
      </Card>
    </Context>
  );
}
export interface KPIHeaderProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function KPIHeader({
  children,
  className,
  ...props
}: KPIHeaderProps): ReactElement {
  useKpi();
  return (
    <div
      {...props}
      className={part('header', className)}
      data-slot='kpi-header'
    >
      {children}
    </div>
  );
}
export interface KPIContentProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function KPIContent({
  children,
  className,
  ...props
}: KPIContentProps): ReactElement {
  useKpi();
  return (
    <div
      {...props}
      className={part('content', className)}
      data-slot='kpi-content'
    >
      {children}
    </div>
  );
}
export interface KPIIconProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
  status?: Status;
}
function KPIIcon({
  children,
  className,
  status,
  ...props
}: KPIIconProps): ReactElement {
  useKpi();
  return (
    <div
      {...props}
      className={part('icon', className)}
      data-slot='kpi-icon'
      data-status={status}
    >
      {children}
    </div>
  );
}
export interface KPITitleProps extends ComponentPropsWithRef<'dt'> {
  children: ReactNode;
}
function KPITitle({
  children,
  className,
  ...props
}: KPITitleProps): ReactElement {
  useKpi();
  return (
    <dt {...props} className={part('title', className)} data-slot='kpi-title'>
      {children}
    </dt>
  );
}
export interface KPIValueProps extends Omit<NumberValueRootProps, 'className'> {
  className?: string;
}
function KPIValue({
  children,
  className,
  ...props
}: KPIValueProps): ReactElement {
  useKpi();
  return (
    <NumberValue {...props}>
      {(formatted) => (
        <dd className={part('value', className)} data-slot='kpi-value'>
          {typeof children === 'function' ? children(formatted) : formatted}
        </dd>
      )}
    </NumberValue>
  );
}
export interface KPITrendProps extends TrendChipRootProps {
  className?: string;
}
function KPITrend({ className, ...props }: KPITrendProps): ReactElement {
  useKpi();
  return (
    <TrendChip
      {...props}
      className={part('trend', className) ?? 'kpi__trend'}
      data-slot='kpi-trend'
    />
  );
}
export interface KPIProgressProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  status?: Status;
  value: number;
}
function KPIProgress({
  className,
  status = 'success',
  value,
  ...props
}: KPIProgressProps): ReactElement {
  useKpi();
  const clamped = Math.max(0, Math.min(100, value));
  return (
    <div
      {...props}
      className={part('progress', className)}
      data-slot='kpi-progress'
    >
      <ProgressBar
        aria-label='Progress'
        color={status}
        size='sm'
        value={clamped}
      >
        <ProgressBar.Track>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
    </div>
  );
}
export interface KPIActionsProps extends ComponentPropsWithRef<typeof Button> {
  children?: ReactNode;
}
function KPIActions({
  children,
  className,
  ...props
}: KPIActionsProps): ReactElement {
  useKpi();
  return (
    <div className='kpi__actions' data-slot='kpi-actions'>
      <Button
        {...props}
        {...(className ? { className } : {})}
        isIconOnly
        size='sm'
        variant='ghost'
      >
        {children ?? (
          <svg aria-hidden fill='currentColor' viewBox='0 0 16 16'>
            <circle cx='8' cy='3' r='1.5' />
            <circle cx='8' cy='8' r='1.5' />
            <circle cx='8' cy='13' r='1.5' />
          </svg>
        )}
      </Button>
    </div>
  );
}
export interface KPIChartProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'color'
> {
  color?: string;
  data: Record<string, number | string>[];
  dataKey?: string;
  fillColor?: string;
  height?: number;
  strokeWidth?: number;
}
function KPIChart({
  className,
  color = 'currentColor',
  data,
  dataKey = 'value',
  fillColor,
  height = 80,
  strokeWidth = 2,
  ...props
}: KPIChartProps): ReactElement {
  useKpi();
  const gradientId = `kpi-chart-gradient-${useId().replaceAll(':', '')}`;
  const fill = fillColor ?? color;
  return (
    <div {...props} className={part('chart', className)} data-slot='kpi-chart'>
      <ResponsiveContainer height={height} width='100%'>
        <AreaChart
          data={data}
          margin={{ bottom: 0, left: 0, right: 0, top: 4 }}
        >
          <defs>
            <linearGradient id={gradientId} x1='0' x2='0' y1='0' y2='1'>
              <stop offset='0%' stopColor={fill} stopOpacity={0.2} />
              <stop offset='100%' stopColor={fill} stopOpacity={0.02} />
            </linearGradient>
          </defs>
          <Area
            dataKey={dataKey}
            fill={`url(#${gradientId})`}
            isAnimationActive={false}
            stroke={color}
            strokeWidth={strokeWidth}
            type='monotone'
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
export interface KPISeparatorProps extends ComponentPropsWithRef<
  typeof Separator
> {}
function KPISeparator({
  className,
  ...props
}: KPISeparatorProps): ReactElement {
  useKpi();
  return (
    <Separator
      {...props}
      className={
        part(
          'separator',
          typeof className === 'string' ? className : undefined,
        ) ?? 'kpi__separator'
      }
      data-slot='kpi-separator'
    />
  );
}
export interface KPIFooterProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function KPIFooter({
  children,
  className,
  ...props
}: KPIFooterProps): ReactElement {
  useKpi();
  return (
    <div
      {...props}
      className={part('footer', className)}
      data-slot='kpi-footer'
    >
      {children}
    </div>
  );
}

type KPIComponent = typeof KPIRoot & {
  Actions: typeof KPIActions;
  Chart: typeof KPIChart;
  Content: typeof KPIContent;
  Footer: typeof KPIFooter;
  Header: typeof KPIHeader;
  Icon: typeof KPIIcon;
  Progress: typeof KPIProgress;
  Root: typeof KPIRoot;
  Separator: typeof KPISeparator;
  Title: typeof KPITitle;
  Trend: typeof KPITrend;
  Value: typeof KPIValue;
};
export const KPI: KPIComponent = Object.assign(KPIRoot, {
  Actions: KPIActions,
  Chart: KPIChart,
  Content: KPIContent,
  Footer: KPIFooter,
  Header: KPIHeader,
  Icon: KPIIcon,
  Progress: KPIProgress,
  Root: KPIRoot,
  Separator: KPISeparator,
  Title: KPITitle,
  Trend: KPITrend,
  Value: KPIValue,
});
export {
  KPIActions,
  KPIChart,
  KPIContent,
  KPIFooter,
  KPIHeader,
  KPIIcon,
  KPIProgress,
  KPIRoot,
  KPISeparator,
  KPITitle,
  KPITrend,
  KPIValue,
};
