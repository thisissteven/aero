'use client';

import { Chip, cn } from '@heroui/react';
import type { ChipRootProps } from '@heroui/react/chip';
import type { HTMLAttributes, ReactElement, ReactNode } from 'react';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useContext,
} from 'react';

type Trend = 'down' | 'neutral' | 'up';
type TrendChipSize = 'lg' | 'md' | 'sm';

const TrendChipContext = createContext({
  indicatorClassName: 'trend-chip__indicator',
  prefixClassName: 'trend-chip__prefix',
  suffixClassName: 'trend-chip__suffix',
});
const trendChipContextValue = {
  indicatorClassName: 'trend-chip__indicator',
  prefixClassName: 'trend-chip__prefix',
  suffixClassName: 'trend-chip__suffix',
};

function ArrowUp(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill='none'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      viewBox='0 0 24 24'
      {...props}
    >
      <path d='M12 19V5m-5 5 5-5 5 5' />
    </svg>
  );
}
function ArrowDown(props: React.SVGProps<SVGSVGElement>) {
  return (
    <svg
      fill='none'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth={2}
      viewBox='0 0 24 24'
      {...props}
    >
      <path d='M12 5v14m5-5-5 5-5-5' />
    </svg>
  );
}

export interface TrendChipIndicatorProps extends HTMLAttributes<HTMLElement> {
  children?: ReactNode;
}

function TrendChipIndicator({
  children,
  className,
  ...props
}: TrendChipIndicatorProps): ReactElement | null {
  const context = useContext(TrendChipContext);
  if (!children || !isValidElement(children)) return null;
  return cloneElement(children as ReactElement<Record<string, unknown>>, {
    ...props,
    className: cn(context.indicatorClassName, className),
    'data-slot': 'trend-chip-indicator',
  });
}

export interface TrendChipAffixProps extends HTMLAttributes<HTMLSpanElement> {
  children: ReactNode;
}

function TrendChipPrefix({
  children,
  className,
  ...props
}: TrendChipAffixProps): ReactElement {
  const context = useContext(TrendChipContext);
  return (
    <span
      className={cn(context.prefixClassName, className)}
      data-slot='trend-chip-prefix'
      {...props}
    >
      {children}
    </span>
  );
}
function TrendChipSuffix({
  children,
  className,
  ...props
}: TrendChipAffixProps): ReactElement {
  const context = useContext(TrendChipContext);
  return (
    <span
      className={cn(context.suffixClassName, className)}
      data-slot='trend-chip-suffix'
      {...props}
    >
      {children}
    </span>
  );
}

export interface TrendChipRootProps extends Omit<
  ChipRootProps,
  'children' | 'color' | 'size'
> {
  children: ReactNode;
  size?: TrendChipSize;
  trend?: Trend;
  variant?: 'primary' | 'secondary' | 'soft' | 'tertiary';
}

function TrendChipRoot({
  children,
  className,
  size = 'sm',
  trend = 'up',
  variant = 'soft',
  ...props
}: TrendChipRootProps): ReactElement {
  let indicator: ReactElement | null = null;
  let prefix: ReactElement | null = null;
  let suffix: ReactElement | null = null;
  const value: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (!isValidElement(child)) value.push(child);
    else if (child.type === TrendChipIndicator) indicator = child;
    else if (child.type === TrendChipPrefix) prefix = child;
    else if (child.type === TrendChipSuffix) suffix = child;
    else value.push(child);
  });
  const defaultIndicator =
    trend === 'up' ? (
      <ArrowUp
        className='trend-chip__indicator'
        data-slot='trend-chip-indicator'
      />
    ) : trend === 'down' ? (
      <ArrowDown
        className='trend-chip__indicator'
        data-slot='trend-chip-indicator'
      />
    ) : null;
  const color =
    trend === 'up' ? 'success' : trend === 'down' ? 'danger' : 'default';
  return (
    <TrendChipContext value={trendChipContextValue}>
      <Chip
        className={cn('trend-chip', `trend-chip--${size}`, className) ?? ''}
        color={color}
        data-slot='trend-chip'
        data-trend={trend}
        size={size}
        variant={variant}
        {...props}
      >
        {indicator ?? defaultIndicator}
        <Chip.Label>
          {prefix}{' '}
          <span className='trend-chip__value' data-slot='trend-chip-value'>
            {value}
          </span>{' '}
          {suffix}
        </Chip.Label>
      </Chip>
    </TrendChipContext>
  );
}

type TrendChipComponent = typeof TrendChipRoot & {
  Indicator: typeof TrendChipIndicator;
  Prefix: typeof TrendChipPrefix;
  Root: typeof TrendChipRoot;
  Suffix: typeof TrendChipSuffix;
};

export const TrendChip: TrendChipComponent = Object.assign(TrendChipRoot, {
  Indicator: TrendChipIndicator,
  Prefix: TrendChipPrefix,
  Root: TrendChipRoot,
  Suffix: TrendChipSuffix,
});
