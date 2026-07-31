'use client';

import { cn, Select } from '@heroui/react';
import { UnfoldMoreIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type {
  ComponentProps,
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
} from 'react';
import { createContext, useContext, useMemo } from 'react';

export type CellSelectVariant = 'default' | 'secondary';

interface CellSelectContextValue {
  variant: CellSelectVariant;
}

const CellSelectContext = createContext<CellSelectContextValue>({
  variant: 'default',
});

export interface CellSelectRootProps extends Omit<
  ComponentProps<typeof Select>,
  'children' | 'variant'
> {
  children: ReactNode;
  variant?: CellSelectVariant;
}

function CellSelectRoot({
  children,
  className,
  variant = 'default',
  ...props
}: CellSelectRootProps): ReactElement {
  const contextValue = useMemo(() => ({ variant }), [variant]);

  return (
    <CellSelectContext value={contextValue}>
      <Select
        {...props}
        className={(renderProps) =>
          cn(
            'cell-select',
            typeof className === 'function'
              ? className(renderProps)
              : className,
          ) ?? 'cell-select'
        }
        data-slot='cell-select'
      >
        {children}
      </Select>
    </CellSelectContext>
  );
}

export type CellSelectTriggerProps = ComponentProps<typeof Select.Trigger>;

function CellSelectTrigger({
  children,
  className,
  ...props
}: CellSelectTriggerProps): ReactElement {
  const { variant } = useContext(CellSelectContext);
  return (
    <Select.Trigger
      {...props}
      className={(renderProps) =>
        cn(
          'cell-select__trigger',
          `cell-select__trigger--${variant}`,
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'cell-select__trigger'
      }
      data-slot='cell-select-trigger'
    >
      {children}
    </Select.Trigger>
  );
}

export type CellSelectLabelProps = ComponentPropsWithRef<'span'>;

function CellSelectLabel({
  children,
  className,
  ...props
}: CellSelectLabelProps): ReactElement {
  return (
    <span
      {...props}
      className={cn('cell-select__label', className)}
      data-slot='cell-select-label'
    >
      {children}
    </span>
  );
}

export type CellSelectValueProps = ComponentProps<typeof Select.Value>;

function CellSelectValue({
  children,
  className,
  ...props
}: CellSelectValueProps): ReactElement {
  return (
    <Select.Value
      {...props}
      className={(renderProps) =>
        cn(
          'cell-select__value',
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'cell-select__value'
      }
      data-slot='cell-select-value'
    >
      {children}
    </Select.Value>
  );
}

export type CellSelectIndicatorProps = ComponentProps<typeof Select.Indicator>;

function CellSelectIndicator({
  children,
  className,
  ...props
}: CellSelectIndicatorProps): ReactElement {
  return (
    <Select.Indicator
      {...props}
      className={
        cn('cell-select__indicator', className) ?? 'cell-select__indicator'
      }
      data-slot='cell-select-indicator'
    >
      {children === undefined ? (
        <HugeiconsIcon
          aria-hidden
          icon={UnfoldMoreIcon}
          size={16}
          strokeWidth={2}
        />
      ) : (
        children
      )}
    </Select.Indicator>
  );
}

export type CellSelectPopoverProps = ComponentProps<typeof Select.Popover>;

function CellSelectPopover({
  children,
  className,
  placement = 'bottom end',
  ...props
}: CellSelectPopoverProps): ReactElement {
  return (
    <Select.Popover
      {...props}
      className={(renderProps) =>
        cn(
          'cell-select__popover',
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? 'cell-select__popover'
      }
      data-slot='cell-select-popover'
      placement={placement}
    >
      {children}
    </Select.Popover>
  );
}

type CellSelectComponent = typeof CellSelectRoot & {
  Indicator: typeof CellSelectIndicator;
  Label: typeof CellSelectLabel;
  Popover: typeof CellSelectPopover;
  Root: typeof CellSelectRoot;
  Trigger: typeof CellSelectTrigger;
  Value: typeof CellSelectValue;
};

export const CellSelect: CellSelectComponent = Object.assign(CellSelectRoot, {
  Indicator: CellSelectIndicator,
  Label: CellSelectLabel,
  Popover: CellSelectPopover,
  Root: CellSelectRoot,
  Trigger: CellSelectTrigger,
  Value: CellSelectValue,
});
