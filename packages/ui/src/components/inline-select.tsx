'use client';

import { cn, Select } from '@heroui/react';
import { UnfoldMoreIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ComponentProps, ReactElement } from 'react';

export type InlineSelectRootProps = ComponentProps<typeof Select>;

function InlineSelectRoot({
  children,
  className,
  ...props
}: InlineSelectRootProps): ReactElement {
  return (
    <Select
      {...props}
      className={(renderProps) =>
        cn(
          'inline-select',
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'inline-select'
      }
      data-slot='inline-select'
    >
      {children}
    </Select>
  );
}

export type InlineSelectTriggerProps = ComponentProps<typeof Select.Trigger>;

function InlineSelectTrigger({
  children,
  className,
  ...props
}: InlineSelectTriggerProps): ReactElement {
  return (
    <Select.Trigger
      {...props}
      className={(renderProps) =>
        cn(
          'inline-select__trigger',
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'inline-select__trigger'
      }
      data-slot='inline-select-trigger'
    >
      {children}
    </Select.Trigger>
  );
}

export type InlineSelectValueProps = ComponentProps<typeof Select.Value>;

function InlineSelectValue({
  children,
  className,
  ...props
}: InlineSelectValueProps): ReactElement {
  return (
    <Select.Value
      {...props}
      className={(renderProps) =>
        cn(
          'inline-select__value',
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'inline-select__value'
      }
      data-slot='inline-select-value'
    >
      {children}
    </Select.Value>
  );
}

export type InlineSelectIndicatorProps = ComponentProps<
  typeof Select.Indicator
>;

function InlineSelectIndicator({
  children,
  className,
  ...props
}: InlineSelectIndicatorProps): ReactElement {
  return (
    <Select.Indicator
      {...props}
      className={
        cn('inline-select__indicator', className) ?? 'inline-select__indicator'
      }
      data-slot='inline-select-indicator'
    >
      {children === undefined ? (
        <HugeiconsIcon
          aria-hidden
          icon={UnfoldMoreIcon}
          size={12}
          strokeWidth={2}
        />
      ) : (
        children
      )}
    </Select.Indicator>
  );
}

export type InlineSelectPopoverProps = ComponentProps<typeof Select.Popover>;

function InlineSelectPopover({
  children,
  className,
  placement = 'bottom end',
  ...props
}: InlineSelectPopoverProps): ReactElement {
  return (
    <Select.Popover
      {...props}
      className={(renderProps) =>
        cn(
          'inline-select__popover',
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'inline-select__popover'
      }
      data-slot='inline-select-popover'
      placement={placement}
    >
      {children}
    </Select.Popover>
  );
}

type InlineSelectComponent = typeof InlineSelectRoot & {
  Indicator: typeof InlineSelectIndicator;
  Popover: typeof InlineSelectPopover;
  Root: typeof InlineSelectRoot;
  Trigger: typeof InlineSelectTrigger;
  Value: typeof InlineSelectValue;
};

export const InlineSelect: InlineSelectComponent = Object.assign(
  InlineSelectRoot,
  {
    Indicator: InlineSelectIndicator,
    Popover: InlineSelectPopover,
    Root: InlineSelectRoot,
    Trigger: InlineSelectTrigger,
    Value: InlineSelectValue,
  },
);
