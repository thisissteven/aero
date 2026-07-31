'use client';

import { cn, dom, type DOMRenderProps } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { createContext, useContext, useMemo } from 'react';

export type ItemCardVariant =
  'default' | 'outline' | 'secondary' | 'tertiary' | 'transparent';
interface ContextValue {
  variant: ItemCardVariant;
}
const Context = createContext<ContextValue | null>(null);
const part = (name: string, className?: string) =>
  cn(`item-card__${name}`, className);

export interface ItemCardRootProps
  extends
    Omit<ComponentPropsWithRef<'div'>, 'className'>,
    DOMRenderProps<'div', undefined> {
  children: ReactNode;
  className?: string;
  variant?: ItemCardVariant;
}
function ItemCardRoot({
  children,
  className,
  variant = 'default',
  ...props
}: ItemCardRootProps): ReactElement {
  const value = useMemo(() => ({ variant }), [variant]);
  return (
    <Context value={value}>
      <dom.div
        {...props}
        className={cn('item-card', `item-card--${variant}`, className)}
        data-slot='item-card'
      >
        {children}
      </dom.div>
    </Context>
  );
}
function usePart() {
  useContext(Context);
}
export interface ItemCardIconProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function ItemCardIcon({
  children,
  className,
  ...props
}: ItemCardIconProps): ReactElement {
  usePart();
  return (
    <div
      {...props}
      className={part('icon', className)}
      data-slot='item-card-icon'
    >
      {children}
    </div>
  );
}
export interface ItemCardContentProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function ItemCardContent({
  children,
  className,
  ...props
}: ItemCardContentProps): ReactElement {
  usePart();
  return (
    <div
      {...props}
      className={part('content', className)}
      data-slot='item-card-content'
    >
      {children}
    </div>
  );
}
export interface ItemCardTitleProps extends ComponentPropsWithRef<'span'> {
  children: ReactNode;
}
function ItemCardTitle({
  children,
  className,
  ...props
}: ItemCardTitleProps): ReactElement {
  usePart();
  return (
    <span
      {...props}
      className={part('title', className)}
      data-slot='item-card-title'
    >
      {children}
    </span>
  );
}
export interface ItemCardDescriptionProps extends ComponentPropsWithRef<'span'> {
  children: ReactNode;
}
function ItemCardDescription({
  children,
  className,
  ...props
}: ItemCardDescriptionProps): ReactElement {
  usePart();
  return (
    <span
      {...props}
      className={part('description', className)}
      data-slot='item-card-description'
    >
      {children}
    </span>
  );
}
export interface ItemCardActionProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function ItemCardAction({
  children,
  className,
  ...props
}: ItemCardActionProps): ReactElement {
  usePart();
  return (
    <div
      {...props}
      className={part('action', className)}
      data-slot='item-card-action'
    >
      {children}
    </div>
  );
}

type ItemCardComponent = typeof ItemCardRoot & {
  Action: typeof ItemCardAction;
  Content: typeof ItemCardContent;
  Description: typeof ItemCardDescription;
  Icon: typeof ItemCardIcon;
  Root: typeof ItemCardRoot;
  Title: typeof ItemCardTitle;
};
export const ItemCard: ItemCardComponent = Object.assign(ItemCardRoot, {
  Action: ItemCardAction,
  Content: ItemCardContent,
  Description: ItemCardDescription,
  Icon: ItemCardIcon,
  Root: ItemCardRoot,
  Title: ItemCardTitle,
});
export {
  ItemCardAction,
  ItemCardContent,
  ItemCardDescription,
  ItemCardIcon,
  ItemCardRoot,
  ItemCardTitle,
};
