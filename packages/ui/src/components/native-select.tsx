'use client';

import { cn } from '@heroui/react';
import { ArrowDown01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import {
  Children,
  createContext,
  isValidElement,
  useContext,
  useMemo,
} from 'react';

export type NativeSelectVariant = 'primary' | 'secondary';

interface NativeSelectContextValue {
  fullWidth: boolean;
  variant: NativeSelectVariant;
}

const NativeSelectContext = createContext<NativeSelectContextValue>({
  fullWidth: false,
  variant: 'primary',
});

export interface NativeSelectRootProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
  fullWidth?: boolean;
  variant?: NativeSelectVariant;
}

function NativeSelectRoot({
  children,
  className,
  fullWidth = false,
  variant = 'primary',
  ...props
}: NativeSelectRootProps): ReactElement {
  const contextValue = useMemo(
    () => ({ fullWidth, variant }),
    [fullWidth, variant],
  );

  return (
    <NativeSelectContext value={contextValue}>
      <div
        {...props}
        className={cn(
          'native-select',
          fullWidth && 'native-select--full-width',
          variant === 'secondary' && 'native-select--secondary',
          className,
        )}
        data-slot='native-select'
      >
        {children}
      </div>
    </NativeSelectContext>
  );
}

export interface NativeSelectTriggerProps extends Omit<
  ComponentPropsWithRef<'select'>,
  'children'
> {
  children: ReactNode;
  wrapperClassName?: string;
}

function NativeSelectTrigger({
  children,
  className,
  wrapperClassName,
  ...props
}: NativeSelectTriggerProps): ReactElement {
  const { fullWidth } = useContext(NativeSelectContext);
  let indicator: ReactElement | null = null;
  const options: ReactNode[] = [];
  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === NativeSelectIndicator) {
      indicator = child;
    } else {
      options.push(child);
    }
  });
  return (
    <div
      className={cn(
        'native-select__trigger',
        fullWidth && 'native-select__trigger--full-width',
        wrapperClassName,
      )}
      data-slot='native-select-trigger'
    >
      <select
        {...props}
        className={cn('native-select__select', className)}
        data-slot='native-select-select'
      >
        {options}
      </select>
      {indicator ?? <NativeSelectIndicator />}
    </div>
  );
}

export type NativeSelectIndicatorProps = ComponentPropsWithRef<'span'>;

function NativeSelectIndicator({
  children,
  className,
  ...props
}: NativeSelectIndicatorProps): ReactElement {
  return (
    <span
      aria-hidden='true'
      {...props}
      className={cn('native-select__indicator', className)}
      data-slot='native-select-indicator'
    >
      {children ?? (
        <HugeiconsIcon
          aria-hidden='true'
          icon={ArrowDown01Icon}
          size={16}
          strokeWidth={2}
        />
      )}
    </span>
  );
}

export type NativeSelectOptionProps = ComponentPropsWithRef<'option'>;

function NativeSelectOption({
  children,
  ...props
}: NativeSelectOptionProps): ReactElement {
  return <option {...props}>{children}</option>;
}

export type NativeSelectOptGroupProps = ComponentPropsWithRef<'optgroup'>;

function NativeSelectOptGroup({
  children,
  ...props
}: NativeSelectOptGroupProps): ReactElement {
  return <optgroup {...props}>{children}</optgroup>;
}

type NativeSelectComponent = typeof NativeSelectRoot & {
  Indicator: typeof NativeSelectIndicator;
  OptGroup: typeof NativeSelectOptGroup;
  Option: typeof NativeSelectOption;
  Root: typeof NativeSelectRoot;
  Trigger: typeof NativeSelectTrigger;
};

export const NativeSelect: NativeSelectComponent = Object.assign(
  NativeSelectRoot,
  {
    Indicator: NativeSelectIndicator,
    OptGroup: NativeSelectOptGroup,
    Option: NativeSelectOption,
    Root: NativeSelectRoot,
    Trigger: NativeSelectTrigger,
  },
);
