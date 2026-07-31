'use client';

import { cn } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { createContext, useMemo } from 'react';

export type EmptyStateSize = 'lg' | 'md' | 'sm';
export type EmptyStateMediaVariant = 'default' | 'icon';

interface EmptyStateContextValue {
  size: EmptyStateSize;
}
const EmptyStateContext = createContext<EmptyStateContextValue>({ size: 'md' });

export interface EmptyStateRootProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
  /** Size variant. @default "md" */
  size?: EmptyStateSize;
}

function EmptyStateRoot({
  children,
  className,
  size = 'md',
  ...props
}: EmptyStateRootProps): ReactElement {
  const value = useMemo(() => ({ size }), [size]);
  return (
    <EmptyStateContext value={value}>
      <div
        {...props}
        className={cn('empty-state', `empty-state--${size}`, className)}
        data-slot='empty-state'
      >
        {children}
      </div>
    </EmptyStateContext>
  );
}

export interface EmptyStateHeaderProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function EmptyStateHeader({
  children,
  className,
  ...props
}: EmptyStateHeaderProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('empty-state__header', className)}
      data-slot='empty-state-header'
    >
      {children}
    </div>
  );
}

export interface EmptyStateMediaProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
  /** Media display variant. "icon" adds a circular muted background. @default "default" */
  variant?: EmptyStateMediaVariant;
}
function EmptyStateMedia({
  children,
  className,
  variant = 'default',
  ...props
}: EmptyStateMediaProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('empty-state__media', className)}
      data-slot='empty-state-media'
      data-variant={variant}
    >
      {children}
    </div>
  );
}

export interface EmptyStateTitleProps extends ComponentPropsWithRef<'h3'> {
  children: ReactNode;
}
function EmptyStateTitle({
  children,
  className,
  ...props
}: EmptyStateTitleProps): ReactElement {
  return (
    <h3
      {...props}
      className={cn('empty-state__title', className)}
      data-slot='empty-state-title'
    >
      {children}
    </h3>
  );
}

export interface EmptyStateDescriptionProps extends ComponentPropsWithRef<'p'> {
  children: ReactNode;
}
function EmptyStateDescription({
  children,
  className,
  ...props
}: EmptyStateDescriptionProps): ReactElement {
  return (
    <p
      {...props}
      className={cn('empty-state__description', className)}
      data-slot='empty-state-description'
    >
      {children}
    </p>
  );
}

export interface EmptyStateContentProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}
function EmptyStateContent({
  children,
  className,
  ...props
}: EmptyStateContentProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('empty-state__content', className)}
      data-slot='empty-state-content'
    >
      {children}
    </div>
  );
}

type EmptyStateComponent = typeof EmptyStateRoot & {
  Content: typeof EmptyStateContent;
  Description: typeof EmptyStateDescription;
  Header: typeof EmptyStateHeader;
  Media: typeof EmptyStateMedia;
  Root: typeof EmptyStateRoot;
  Title: typeof EmptyStateTitle;
};
export const EmptyState: EmptyStateComponent = Object.assign(EmptyStateRoot, {
  Content: EmptyStateContent,
  Description: EmptyStateDescription,
  Header: EmptyStateHeader,
  Media: EmptyStateMedia,
  Root: EmptyStateRoot,
  Title: EmptyStateTitle,
});

export {
  EmptyStateContent,
  EmptyStateDescription,
  EmptyStateHeader,
  EmptyStateMedia,
  EmptyStateRoot,
  EmptyStateTitle,
};
export type EmptyStateProps = EmptyStateRootProps;
