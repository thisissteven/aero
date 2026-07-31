'use client';

import { cn } from '@heroui/react';
import type {
  ComponentPropsWithRef,
  CSSProperties,
  ReactElement,
  ReactNode,
} from 'react';
import { createContext, useContext, useMemo } from 'react';

import type { ItemCardVariant } from './item-card';

type Layout = 'grid' | 'list';
interface ContextValue {
  layout: Layout;
  variant: ItemCardVariant;
}
const Context = createContext<ContextValue | null>(null);
const useGroup = () => {
  const value = useContext(Context);
  if (!value)
    throw new Error(
      'ItemCardGroup parts must be used inside ItemCardGroup.Root',
    );
  return value;
};

export interface ItemCardGroupRootProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
  columns?: 2 | 3;
  layout?: Layout;
  variant?: ItemCardVariant;
}
function ItemCardGroupRoot({
  children,
  className,
  columns,
  layout = 'list',
  style,
  variant = 'default',
  ...props
}: ItemCardGroupRootProps): ReactElement {
  const value = useMemo(() => ({ layout, variant }), [layout, variant]);
  const resolvedStyle =
    layout === 'grid' && columns
      ? ({ ...style, '--item-card-group-columns': columns } as CSSProperties)
      : style;
  return (
    <Context value={value}>
      <div
        {...props}
        className={cn(
          'item-card-group',
          `item-card-group--${layout}`,
          `item-card-group--${variant}`,
          className,
        )}
        data-slot='item-card-group'
        role='group'
        style={resolvedStyle}
      >
        {children}
      </div>
    </Context>
  );
}
export interface ItemCardGroupHeaderProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function ItemCardGroupHeader({
  children,
  className,
  ...props
}: ItemCardGroupHeaderProps): ReactElement {
  useGroup();
  return (
    <div
      {...props}
      className={cn('item-card-group__header', className)}
      data-slot='item-card-group-header'
    >
      {children}
    </div>
  );
}
export interface ItemCardGroupTitleProps extends ComponentPropsWithRef<'h3'> {
  children: ReactNode;
}
function ItemCardGroupTitle({
  children,
  className,
  ...props
}: ItemCardGroupTitleProps): ReactElement {
  useGroup();
  return (
    <h3
      {...props}
      className={cn('item-card-group__title', className)}
      data-slot='item-card-group-title'
    >
      {children}
    </h3>
  );
}
export interface ItemCardGroupDescriptionProps extends ComponentPropsWithRef<'p'> {
  children: ReactNode;
}
function ItemCardGroupDescription({
  children,
  className,
  ...props
}: ItemCardGroupDescriptionProps): ReactElement {
  useGroup();
  return (
    <p
      {...props}
      className={cn('item-card-group__description', className)}
      data-slot='item-card-group-description'
    >
      {children}
    </p>
  );
}

type ItemCardGroupComponent = typeof ItemCardGroupRoot & {
  Description: typeof ItemCardGroupDescription;
  Header: typeof ItemCardGroupHeader;
  Root: typeof ItemCardGroupRoot;
  Title: typeof ItemCardGroupTitle;
};
export const ItemCardGroup: ItemCardGroupComponent = Object.assign(
  ItemCardGroupRoot,
  {
    Description: ItemCardGroupDescription,
    Header: ItemCardGroupHeader,
    Root: ItemCardGroupRoot,
    Title: ItemCardGroupTitle,
  },
);
export {
  ItemCardGroupDescription,
  ItemCardGroupHeader,
  ItemCardGroupRoot,
  ItemCardGroupTitle,
};
