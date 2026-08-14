'use client';

import {
  DropdownItem as HeroUIDropdownItem,
  DropdownItemIndicator as HeroUIDropdownItemIndicator,
  DropdownMenu as HeroUIDropdownMenu,
  DropdownPopover as HeroUIDropdownPopover,
  DropdownRoot as HeroUIDropdownRoot,
  DropdownSection as HeroUIDropdownSection,
  DropdownSubmenuIndicator as HeroUIDropdownSubmenuIndicator,
  DropdownSubmenuTrigger as HeroUIDropdownSubmenuTrigger,
  DropdownTrigger as HeroUIDropdownTrigger,
} from '@heroui/react/dropdown';
import type { ComponentPropsWithRef } from 'react';
import React, { createContext } from 'react';

// 1. Re-export everything from HeroUI
export * from '@heroui/react/dropdown';

// 2. Types
export type DropdownSize = 'sm' | 'md' | 'lg';

export interface DropdownRootProps extends ComponentPropsWithRef<
  typeof HeroUIDropdownRoot
> {
  size?: DropdownSize;
}

const DropdownSizeContext = createContext<{ size: DropdownSize }>({
  size: 'md',
});

// 3. Root Component
export const DropdownRoot = ({
  children,
  size = 'md',
  ...props
}: DropdownRootProps) => {
  return (
    <DropdownSizeContext.Provider value={{ size }}>
      <HeroUIDropdownRoot {...props}>{children}</HeroUIDropdownRoot>
    </DropdownSizeContext.Provider>
  );
};

// 4. Leave Trigger alone (Direct pass-through)
export const DropdownTrigger = HeroUIDropdownTrigger;

// 5. Popover & Menu receive size for menu/item sizing
export const DropdownPopover = ({
  children,
  ...props
}: ComponentPropsWithRef<typeof HeroUIDropdownPopover>) => {
  const { size } = React.use(DropdownSizeContext);
  return (
    <HeroUIDropdownPopover data-size={size} {...props}>
      {children}
    </HeroUIDropdownPopover>
  );
};

export const DropdownMenu = <T extends object>({
  ...props
}: ComponentPropsWithRef<typeof HeroUIDropdownMenu<T>>) => {
  const { size } = React.use(DropdownSizeContext);
  return <HeroUIDropdownMenu data-size={size} {...props} />;
};

// Standard Subcomponents
export const DropdownItem = HeroUIDropdownItem;
export const DropdownSection = HeroUIDropdownSection;
export const DropdownItemIndicator = HeroUIDropdownItemIndicator;
export const DropdownSubmenuTrigger = HeroUIDropdownSubmenuTrigger;
export const DropdownSubmenuIndicator = HeroUIDropdownSubmenuIndicator;

// 6. Compound Export
export const Dropdown = Object.assign(DropdownRoot, {
  Trigger: DropdownTrigger,
  Popover: DropdownPopover,
  Menu: DropdownMenu,
  Item: DropdownItem,
  Section: DropdownSection,
  ItemIndicator: DropdownItemIndicator,
  SubmenuTrigger: DropdownSubmenuTrigger,
  SubmenuIndicator: DropdownSubmenuIndicator,
});
