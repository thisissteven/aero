'use client';

import { Checkbox, cn } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import { createContext, useContext, useMemo, useRef } from 'react';
import type {
  GridListItemProps,
  GridListProps,
  SelectionMode,
} from 'react-aria-components';
import {
  GridList,
  GridListItem,
  ListLayout,
  Virtualizer,
} from 'react-aria-components';

export type ListViewVariant = 'primary' | 'secondary';
interface ListViewContextValue {
  selectionMode: SelectionMode;
  variant: ListViewVariant;
}
const ListViewContext = createContext<ListViewContextValue>({
  selectionMode: 'none',
  variant: 'primary',
});

export interface ListViewRootProps<T extends object> extends Omit<
  GridListProps<T>,
  'renderEmptyState' | 'selectionMode'
> {
  /** Estimated row height in pixels for virtualization. @default 48 */
  rowHeight?: number;
  /** Enable row virtualization for large datasets. @default false */
  virtualized?: boolean;
  /** Render function for the empty state. */
  renderEmptyState?: () => ReactNode;
  /** Visual variant. @default "primary" */
  variant?: ListViewVariant;
  selectionMode?: SelectionMode;
}

function ListViewRoot<T extends object>({
  children,
  className,
  renderEmptyState,
  rowHeight = 48,
  selectionBehavior = 'toggle',
  selectionMode = 'none',
  variant = 'primary',
  virtualized = false,
  ...props
}: ListViewRootProps<T>): ReactElement {
  const ref = useRef<HTMLDivElement | null>(null);
  const value = useMemo(
    () => ({ selectionMode, variant }),
    [selectionMode, variant],
  );
  const empty = renderEmptyState
    ? () => (
        <div
          className='list-view__empty-state'
          data-slot='list-view-empty-state'
        >
          {renderEmptyState()}
        </div>
      )
    : undefined;
  const grid = (
    <GridList
      ref={ref}
      className={(state) =>
        cn(
          'list-view',
          `list-view--${variant}`,
          typeof className === 'function' ? className(state) : className,
        ) ?? `list-view list-view--${variant}`
      }
      data-slot='list-view'
      data-virtualized={virtualized || undefined}
      {...(empty ? { renderEmptyState: empty } : {})}
      {...(selectionMode === 'none'
        ? {}
        : { selectionBehavior, selectionMode })}
      {...props}
    >
      {children}
    </GridList>
  );
  return (
    <ListViewContext value={value}>
      {virtualized ? (
        <Virtualizer
          layout={ListLayout}
          layoutOptions={{ estimatedRowHeight: rowHeight }}
        >
          {grid}
        </Virtualizer>
      ) : (
        grid
      )}
    </ListViewContext>
  );
}

export interface ListViewItemProps extends Omit<GridListItemProps, 'children'> {
  children: ReactNode;
}
function ListViewItem({
  children,
  className,
  ...props
}: ListViewItemProps): ReactElement {
  const { selectionMode, variant } = useContext(ListViewContext);
  return (
    <GridListItem
      className={(state) =>
        cn(
          'list-view__item',
          typeof className === 'function' ? className(state) : className,
        ) ?? 'list-view__item'
      }
      data-slot='list-view-item'
      {...props}
    >
      {({ selectionBehavior, selectionMode: currentMode }) => (
        <>
          {selectionMode !== 'none' &&
          currentMode !== 'none' &&
          selectionBehavior === 'toggle' ? (
            <div
              className='list-view__selection-cell'
              data-slot='list-view-selection-cell'
            >
              <Checkbox
                aria-label='Select row'
                slot='selection'
                variant={variant === 'secondary' ? 'primary' : 'secondary'}
              >
                <Checkbox.Content>
                  <Checkbox.Control>
                    <Checkbox.Indicator />
                  </Checkbox.Control>
                </Checkbox.Content>
              </Checkbox>
            </div>
          ) : null}
          {children}
        </>
      )}
    </GridListItem>
  );
}

function ListViewItemContent({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  return (
    <div
      className={cn('list-view__item-content', className)}
      data-slot='list-view-item-content'
      {...props}
    >
      {children}
    </div>
  );
}
function ListViewTitle({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement {
  return (
    <span
      className={cn('list-view__title', className)}
      data-slot='list-view-title'
      {...props}
    >
      {children}
    </span>
  );
}
function ListViewDescription({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'span'>): ReactElement {
  return (
    <span
      className={cn('list-view__description', className)}
      data-slot='list-view-description'
      {...props}
    >
      {children}
    </span>
  );
}
function ListViewItemAction({
  children,
  className,
  ...props
}: ComponentPropsWithRef<'div'>): ReactElement {
  return (
    <div
      className={cn('list-view__item-action', className)}
      data-slot='list-view-item-action'
      {...props}
    >
      {children}
    </div>
  );
}

type ListViewComponent = typeof ListViewRoot & {
  Description: typeof ListViewDescription;
  Item: typeof ListViewItem;
  ItemAction: typeof ListViewItemAction;
  ItemContent: typeof ListViewItemContent;
  Root: typeof ListViewRoot;
  Title: typeof ListViewTitle;
};
export const ListView: ListViewComponent = Object.assign(ListViewRoot, {
  Description: ListViewDescription,
  Item: ListViewItem,
  ItemAction: ListViewItemAction,
  ItemContent: ListViewItemContent,
  Root: ListViewRoot,
  Title: ListViewTitle,
});

export {
  ListViewDescription,
  ListViewItem,
  ListViewItemAction,
  ListViewItemContent,
  ListViewRoot,
  ListViewTitle,
};
