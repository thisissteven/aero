'use client';

import { cn } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { createContext, useCallback, useContext, useMemo } from 'react';
import {
  type Key,
  SelectionIndicator,
  ToggleButton,
  ToggleButtonGroup,
} from 'react-aria-components';

export type SegmentSize = 'lg' | 'md' | 'sm';
export type SegmentVariant = 'default' | 'ghost';
interface SegmentContextValue {
  indicatorClass: string;
  itemClass: string;
}
const Context = createContext<SegmentContextValue>({
  indicatorClass: 'segment__indicator',
  itemClass: 'segment__item segment__item--md',
});

export interface SegmentRootProps extends Omit<
  ComponentPropsWithRef<typeof ToggleButtonGroup>,
  | 'className'
  | 'defaultSelectedKeys'
  | 'onSelectionChange'
  | 'orientation'
  | 'selectedKeys'
  | 'selectionMode'
> {
  className?: string;
  defaultSelectedKey?: Key;
  isDisabled?: boolean;
  onSelectionChange?: (key: Key) => void;
  selectedKey?: Key | null;
  size?: SegmentSize;
  variant?: SegmentVariant;
}
export function SegmentRoot({
  children,
  className,
  defaultSelectedKey,
  isDisabled,
  onSelectionChange,
  selectedKey,
  size = 'md',
  variant = 'default',
  ...props
}: SegmentRootProps): ReactElement {
  const context = useMemo(
    () => ({
      indicatorClass:
        cn(
          'segment__indicator',
          variant === 'ghost' && 'segment__indicator--ghost',
        ) ?? '',
      itemClass:
        cn(
          'segment__item',
          `segment__item--${size}`,
          variant === 'ghost' && 'segment__item--ghost',
        ) ?? '',
    }),
    [size, variant],
  );
  const handleSelectionChange = useCallback(
    (keys: 'all' | Set<Key>) => {
      if (keys === 'all') return;
      const key = keys.values().next().value;
      if (key != null) onSelectionChange?.(key);
    },
    [onSelectionChange],
  );
  return (
    <Context value={context}>
      <ToggleButtonGroup
        {...props}
        {...(defaultSelectedKey != null
          ? { defaultSelectedKeys: [defaultSelectedKey] }
          : {})}
        {...(isDisabled != null ? { isDisabled } : {})}
        {...(selectedKey != null ? { selectedKeys: [selectedKey] } : {})}
        disallowEmptySelection
        className={
          cn(
            'segment',
            `segment--${size}`,
            variant === 'ghost' && 'segment--ghost',
            className,
          ) ?? ''
        }
        data-slot='segment'
        orientation='horizontal'
        selectionMode='single'
        onSelectionChange={handleSelectionChange}
      >
        {children}
      </ToggleButtonGroup>
    </Context>
  );
}

export interface SegmentItemProps extends ComponentPropsWithRef<
  typeof ToggleButton
> {
  className?: string;
}
export function SegmentItem({
  children,
  className,
  ...props
}: SegmentItemProps): ReactElement {
  const context = useContext(Context);
  return (
    <ToggleButton
      {...props}
      className={cn(context.itemClass, className) ?? ''}
      data-slot='segment-item'
    >
      {(renderProps) => (
        <>
          <SelectionIndicator
            className={context.indicatorClass}
            data-slot='segment-indicator'
          />
          {typeof children === 'function' ? children(renderProps) : children}
        </>
      )}
    </ToggleButton>
  );
}

export type SegmentSeparatorProps = ComponentPropsWithRef<'span'>;
export function SegmentSeparator({
  className,
  ...props
}: SegmentSeparatorProps): ReactElement {
  return (
    <span
      {...props}
      aria-hidden='true'
      className={cn('segment__separator', className)}
      data-slot='segment-separator'
    />
  );
}

type SegmentComponent = typeof SegmentRoot & {
  Item: typeof SegmentItem;
  Root: typeof SegmentRoot;
  Separator: typeof SegmentSeparator;
};
export const Segment: SegmentComponent = Object.assign(SegmentRoot, {
  Item: SegmentItem,
  Root: SegmentRoot,
  Separator: SegmentSeparator,
});
