'use client';

import { cn } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { createContext, useMemo } from 'react';

import {
  ListView,
  type ListViewItemProps,
  type ListViewRootProps,
} from './list-view';

export type ChatListViewDensity = 'comfortable' | 'compact';

const DensityContext = createContext<ChatListViewDensity>('comfortable');
type RootClassFunction = Exclude<
  ListViewRootProps<object>['className'],
  string | undefined
>;
type RootClassState = Parameters<RootClassFunction>[0];

const mergeRootClass = <T extends object>(
  base: string,
  className: ListViewRootProps<T>['className'],
): string | ((state: RootClassState) => string) =>
  typeof className === 'function'
    ? (state) => cn(className(state), base) ?? base
    : (cn(className, base) ?? base);

export interface ChatListViewRootProps<T extends object> extends Omit<
  ListViewRootProps<T>,
  'variant'
> {
  /** Row density. @default "comfortable" */
  density?: ChatListViewDensity;
}

function ChatListViewRoot<T extends object>({
  children,
  className,
  density = 'comfortable',
  ...props
}: ChatListViewRootProps<T>): ReactElement {
  const rootClass = useMemo(
    () => `chat-list-view chat-list-view--${density}`,
    [density],
  );

  return (
    <DensityContext value={density}>
      <ListView.Root
        className={mergeRootClass(rootClass, className)}
        data-slot='chat-list-view'
        variant='secondary'
        {...props}
      >
        {children}
      </ListView.Root>
    </DensityContext>
  );
}

export interface ChatListViewItemProps extends ListViewItemProps {
  children: ReactNode;
}

export function ChatListViewItem({
  children,
  className,
  ...props
}: ChatListViewItemProps): ReactElement {
  return (
    <ListView.Item
      data-slot='chat-list-view-item'
      {...props}
      {...(className === undefined ? {} : { className })}
    >
      {children}
    </ListView.Item>
  );
}

export function ChatListViewItemContent({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  return (
    <ListView.ItemContent
      data-slot='chat-list-view-item-content'
      {...props}
      {...(className === undefined ? {} : { className })}
    >
      {children}
    </ListView.ItemContent>
  );
}

export function ChatListViewIcon({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  return (
    <div
      className={cn('chat-list-view__icon', className)}
      data-slot='chat-list-view-icon'
      {...props}
    >
      {children}
    </div>
  );
}

export function ChatListViewText({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  return (
    <div
      className={cn('chat-list-view__text', className)}
      data-slot='chat-list-view-text'
      {...props}
    >
      {children}
    </div>
  );
}

export function ChatListViewTitle({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement {
  return (
    <ListView.Title
      className={cn('chat-list-view__title', className)}
      data-slot='chat-list-view-title'
      {...props}
    >
      {children}
    </ListView.Title>
  );
}

export function ChatListViewPreview({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement {
  return (
    <ListView.Description
      className={cn('chat-list-view__preview', className)}
      data-slot='chat-list-view-preview'
      {...props}
    >
      {children}
    </ListView.Description>
  );
}

export function ChatListViewMeta({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  return (
    <ListView.ItemAction
      className={cn('chat-list-view__meta', className)}
      data-slot='chat-list-view-meta'
      {...props}
    >
      {children}
    </ListView.ItemAction>
  );
}

export interface ChatListViewComponent {
  <T extends object>(props: ChatListViewRootProps<T>): ReactElement;
  Icon: typeof ChatListViewIcon;
  Item: typeof ChatListViewItem;
  ItemContent: typeof ChatListViewItemContent;
  Meta: typeof ChatListViewMeta;
  Preview: typeof ChatListViewPreview;
  Root: typeof ChatListViewRoot;
  Text: typeof ChatListViewText;
  Title: typeof ChatListViewTitle;
}

export const ChatListView = Object.assign(ChatListViewRoot, {
  Icon: ChatListViewIcon,
  Item: ChatListViewItem,
  ItemContent: ChatListViewItemContent,
  Meta: ChatListViewMeta,
  Preview: ChatListViewPreview,
  Root: ChatListViewRoot,
  Text: ChatListViewText,
  Title: ChatListViewTitle,
}) as ChatListViewComponent;
