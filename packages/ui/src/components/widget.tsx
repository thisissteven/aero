'use client';

import { cn, dom, type DOMRenderProps } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { createContext, useContext } from 'react';

const Context = createContext(true);
const useWidget = () => useContext(Context);
const part = (name: string, className?: string) =>
  cn(`widget__${name}`, className);

export interface WidgetRootProps
  extends
    Omit<ComponentPropsWithRef<'div'>, 'className'>,
    DOMRenderProps<'div', undefined> {
  children: ReactNode;
  className?: string;
}
function WidgetRoot({
  children,
  className,
  ...props
}: WidgetRootProps): ReactElement {
  return (
    <Context value>
      <dom.div
        {...props}
        className={cn('widget', className)}
        data-slot='widget'
      >
        {children}
      </dom.div>
    </Context>
  );
}
export interface WidgetHeaderProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function WidgetHeader({
  children,
  className,
  ...props
}: WidgetHeaderProps): ReactElement {
  useWidget();
  return (
    <div
      {...props}
      className={part('header', className)}
      data-slot='widget-header'
    >
      {children}
    </div>
  );
}
export interface WidgetTitleProps extends ComponentPropsWithRef<'span'> {
  children: ReactNode;
}
function WidgetTitle({
  children,
  className,
  ...props
}: WidgetTitleProps): ReactElement {
  useWidget();
  return (
    <span
      {...props}
      className={part('title', className)}
      data-slot='widget-title'
    >
      {children}
    </span>
  );
}
export interface WidgetDescriptionProps extends ComponentPropsWithRef<'span'> {
  children: ReactNode;
}
function WidgetDescription({
  children,
  className,
  ...props
}: WidgetDescriptionProps): ReactElement {
  useWidget();
  return (
    <span
      {...props}
      className={part('description', className)}
      data-slot='widget-description'
    >
      {children}
    </span>
  );
}
export interface WidgetContentProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function WidgetContent({
  children,
  className,
  ...props
}: WidgetContentProps): ReactElement {
  useWidget();
  return (
    <div
      {...props}
      className={part('content', className)}
      data-slot='widget-content'
    >
      {children}
    </div>
  );
}
export interface WidgetFooterProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function WidgetFooter({
  children,
  className,
  ...props
}: WidgetFooterProps): ReactElement {
  useWidget();
  return (
    <div
      {...props}
      className={part('footer', className)}
      data-slot='widget-footer'
    >
      {children}
    </div>
  );
}
export interface WidgetLegendProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function WidgetLegend({
  children,
  className,
  ...props
}: WidgetLegendProps): ReactElement {
  useWidget();
  return (
    <div
      {...props}
      className={part('legend', className)}
      data-slot='widget-legend'
    >
      {children}
    </div>
  );
}
export interface WidgetLegendItemProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
  color: string;
}
function WidgetLegendItem({
  children,
  className,
  color,
  ...props
}: WidgetLegendItemProps): ReactElement {
  useWidget();
  return (
    <div
      {...props}
      className={part('legend-item', className)}
      data-slot='widget-legend-item'
    >
      <span
        className='widget__legend-item-dot'
        data-slot='widget-legend-item-dot'
        style={{ backgroundColor: color }}
      />
      <span
        className='widget__legend-item-label'
        data-slot='widget-legend-item-label'
      >
        {children}
      </span>
    </div>
  );
}

type WidgetComponent = typeof WidgetRoot & {
  Content: typeof WidgetContent;
  Description: typeof WidgetDescription;
  Footer: typeof WidgetFooter;
  Header: typeof WidgetHeader;
  Legend: typeof WidgetLegend;
  LegendItem: typeof WidgetLegendItem;
  Root: typeof WidgetRoot;
  Title: typeof WidgetTitle;
};
export const Widget: WidgetComponent = Object.assign(WidgetRoot, {
  Content: WidgetContent,
  Description: WidgetDescription,
  Footer: WidgetFooter,
  Header: WidgetHeader,
  Legend: WidgetLegend,
  LegendItem: WidgetLegendItem,
  Root: WidgetRoot,
  Title: WidgetTitle,
});
export {
  WidgetContent,
  WidgetDescription,
  WidgetFooter,
  WidgetHeader,
  WidgetLegend,
  WidgetLegendItem,
  WidgetRoot,
  WidgetTitle,
};
