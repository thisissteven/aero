'use client';

import { cn } from '@heroui/react';
import type { ReactElement, ReactNode } from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
} from 'react';
import type {
  RadioGroupProps,
  RadioGroupRenderProps,
  RadioProps,
} from 'react-aria-components';
import { Radio, RadioGroup } from 'react-aria-components';

export function StarIcon(props: React.SVGProps<SVGSVGElement>): ReactElement {
  return (
    <svg
      aria-hidden='true'
      fill='currentColor'
      viewBox='0 0 16 16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path d='M6.886.773C7.29-.231 8.71-.231 9.114.773l1.472 3.667 3.943.268c1.08.073 1.518 1.424.688 2.118L12.185 9.36l.964 3.832c.264 1.05-.886 1.884-1.802 1.31L8 12.4l-3.347 2.101c-.916.575-2.066-.26-1.802-1.309l.964-3.832L.783 6.826c-.83-.694-.391-2.045.688-2.118l3.943-.268z' />
    </svg>
  );
}

export interface RatingItemRenderProps {
  isActive: boolean;
  isPartial: boolean;
  partialPercent: number;
}

interface RatingContextValue {
  hoveredValue: number | null;
  icon?: ReactNode;
  isReadOnly: boolean;
  onItemHoverEnd: () => void;
  onItemHoverStart: (value: number) => void;
  size: 'lg' | 'md' | 'sm';
  value: number;
}

const RatingContext = createContext<RatingContextValue>({
  hoveredValue: null,
  isReadOnly: false,
  onItemHoverEnd: () => {},
  onItemHoverStart: () => {},
  size: 'md',
  value: 0,
});

export interface RatingRootProps extends Omit<
  RadioGroupProps,
  'children' | 'defaultValue' | 'onChange' | 'value'
> {
  children: ReactNode | ((props: RadioGroupRenderProps) => ReactNode);
  defaultValue?: number;
  icon?: ReactNode;
  onValueChange?: (value: number) => void;
  size?: 'lg' | 'md' | 'sm';
  value?: number;
}

function RatingRoot({
  children,
  className,
  defaultValue,
  icon,
  isReadOnly,
  onValueChange,
  size = 'md',
  value,
  ...props
}: RatingRootProps): ReactElement {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [uncontrolledValue, setUncontrolledValue] = useState(defaultValue);
  const hoverTimer = useRef<ReturnType<typeof setTimeout>>(undefined);
  const resolvedValue = value ?? uncontrolledValue ?? 0;
  const onChange = (next: string) => {
    const numeric = Number(next);
    setUncontrolledValue(numeric);
    onValueChange?.(numeric);
  };
  const onItemHoverStart = useCallback((next: number) => {
    clearTimeout(hoverTimer.current);
    hoverTimer.current = undefined;
    setHoveredValue(next);
  }, []);
  const onItemHoverEnd = useCallback(() => {
    hoverTimer.current = setTimeout(() => setHoveredValue(null), 50);
  }, []);
  const context = useMemo<RatingContextValue>(
    () => ({
      hoveredValue,
      ...(icon !== undefined ? { icon } : {}),
      isReadOnly: isReadOnly ?? false,
      onItemHoverEnd,
      onItemHoverStart,
      size,
      value: resolvedValue,
    }),
    [
      hoveredValue,
      icon,
      isReadOnly,
      onItemHoverEnd,
      onItemHoverStart,
      resolvedValue,
      size,
    ],
  );
  return (
    <RatingContext value={context}>
      <RadioGroup
        {...props}
        className={cn('rating', `rating--${size}`, className) ?? ''}
        data-slot='rating'
        orientation='horizontal'
        {...(isReadOnly ? { 'data-readonly': true, isReadOnly: true } : {})}
        {...(defaultValue != null
          ? { defaultValue: String(defaultValue) }
          : {})}
        {...(value != null ? { value: String(Math.floor(value)) } : {})}
        onChange={onChange}
      >
        {(renderProps) => (
          <>
            {typeof children === 'function' ? children(renderProps) : children}
          </>
        )}
      </RadioGroup>
    </RatingContext>
  );
}

export interface RatingItemProps extends Omit<
  RadioProps,
  'children' | 'value'
> {
  children?: ReactNode | ((props: RatingItemRenderProps) => ReactNode);
  value: number;
}

function RatingItem({
  children,
  className,
  value,
  ...props
}: RatingItemProps): ReactElement {
  const context = useContext(RatingContext);
  const isActive =
    context.hoveredValue !== null
      ? value <= context.hoveredValue
      : value <= Math.floor(context.value);
  const partialPercent =
    !isActive &&
    context.isReadOnly &&
    context.hoveredValue === null &&
    value - 1 < context.value &&
    context.value < value
      ? Math.round((context.value - (value - 1)) * 100)
      : null;
  const isPartial = partialPercent !== null;
  const common = {
    ...props,
    'aria-label': `${value} star${value !== 1 ? 's' : ''}`,
    className:
      cn('rating__item', `rating__item--${context.size}`, className) ?? '',
    'data-active': isActive || undefined,
    'data-readonly': context.isReadOnly || undefined,
    'data-slot': 'rating-item',
    value: String(value),
    onHoverEnd: (
      event: Parameters<NonNullable<RadioProps['onHoverEnd']>>[0],
    ) => {
      context.onItemHoverEnd();
      props.onHoverEnd?.(event);
    },
    onHoverStart: (
      event: Parameters<NonNullable<RadioProps['onHoverStart']>>[0],
    ) => {
      context.onItemHoverStart(value);
      props.onHoverStart?.(event);
    },
  };
  if (typeof children === 'function') {
    return (
      <Radio {...common}>
        {children({
          isActive: isActive || isPartial,
          isPartial,
          partialPercent: partialPercent ?? 0,
        })}
      </Radio>
    );
  }
  const renderedIcon = children || context.icon || <StarIcon />;
  return (
    <Radio {...common}>
      <span className='rating__icon' data-slot='rating-icon'>
        {renderedIcon}
      </span>
      {isPartial ? (
        <span
          className='rating__icon-partial'
          data-slot='rating-icon-partial'
          style={
            { '--rating-partial': `${partialPercent}%` } as React.CSSProperties
          }
        >
          {renderedIcon}
        </span>
      ) : null}
    </Radio>
  );
}

type RatingComponent = typeof RatingRoot & {
  Item: typeof RatingItem;
  Root: typeof RatingRoot;
};

export const Rating: RatingComponent = Object.assign(RatingRoot, {
  Item: RatingItem,
  Root: RatingRoot,
});
