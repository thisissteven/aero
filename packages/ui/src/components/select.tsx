'use client';

import type {
  SelectPopoverProps as HeroUISelectPopoverProps,
  SelectRootProps as HeroUISelectRootProps,
} from '@heroui/react/select';
import {
  Select as HeroUISelect,
  SelectClearButton as HeroUISelectClearButton,
  SelectIndicator as HeroUISelectIndicator,
  SelectPopover as HeroUISelectPopover,
  SelectTrigger as HeroUISelectTrigger,
  SelectValue as HeroUISelectValue,
} from '@heroui/react/select';
import { createContext, type ReactElement, use } from 'react';

import { cn } from '../utils';

// Re-export the untouched primitives (SelectTrigger, SelectValue, …).
export * from '@heroui/react/select';

/**
 * `sm` and `lg` mirror the sizes the Dropdown exposes. Sizing lives in
 * `styles/components/select.css` so the trigger and the popover share one
 * definition, the same way `dropdown.css` drives Dropdown.
 */
export type SelectSize = 'sm' | 'lg';

const SelectSizeContext = createContext<SelectSize | undefined>(undefined);

const selectSizeClass = (size?: SelectSize) => (size ? `select--${size}` : '');

interface SelectRootProps<
  T extends object,
  M extends 'single' | 'multiple' = 'single',
> extends HeroUISelectRootProps<T, M> {
  size?: SelectSize;
}

function SelectRoot<
  T extends object = object,
  M extends 'single' | 'multiple' = 'single',
>({ className, size, ...props }: SelectRootProps<T, M>): ReactElement {
  return (
    <SelectSizeContext value={size}>
      <HeroUISelect<T, M>
        className={(renderProps) =>
          cn(
            selectSizeClass(size),
            typeof className === 'function'
              ? className(renderProps)
              : className,
          ) ?? ''
        }
        {...props}
      />
    </SelectSizeContext>
  );
}

function SelectPopover({
  className,
  ...props
}: HeroUISelectPopoverProps): ReactElement {
  const size = use(SelectSizeContext);
  return (
    <HeroUISelectPopover
      className={(renderProps) =>
        cn(
          size && `select__popover--${size}`,
          typeof className === 'function' ? className(renderProps) : className,
        ) ?? ''
      }
      {...props}
    />
  );
}

type SelectComponent = typeof SelectRoot & {
  Root: typeof SelectRoot;
  Trigger: typeof HeroUISelectTrigger;
  Value: typeof HeroUISelectValue;
  Indicator: typeof HeroUISelectIndicator;
  ClearButton: typeof HeroUISelectClearButton;
  Popover: typeof SelectPopover;
};

export const Select: SelectComponent = Object.assign(SelectRoot, {
  Root: SelectRoot,
  Trigger: HeroUISelectTrigger,
  Value: HeroUISelectValue,
  Indicator: HeroUISelectIndicator,
  ClearButton: HeroUISelectClearButton,
  Popover: SelectPopover,
});

export { SelectPopover, SelectRoot };
