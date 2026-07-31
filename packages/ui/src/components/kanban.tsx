'use client';

import { cn, ScrollShadow } from '@heroui/react';
import { type ListData, useListData } from '@react-stately/data';
import { motion } from 'motion/react';
import type {
  ComponentPropsWithRef,
  CSSProperties,
  ReactElement,
  ReactNode,
} from 'react';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import {
  Button,
  DropIndicator,
  type DropIndicatorProps,
  GridList,
  GridListItem,
  type GridListItemProps,
  type GridListProps,
  type ItemDropTarget,
  type Key,
  useDragAndDrop,
} from 'react-aria-components';

export type KanbanSize = 'lg' | 'md' | 'sm';
interface KanbanContextValue {
  cardClass: string;
  cardContentClass: string;
  cardListClass: string;
}
const Context = createContext<KanbanContextValue>({
  cardClass: 'kanban__card--md',
  cardContentClass: 'kanban__card-content--md',
  cardListClass: 'kanban__card-list--md',
});
const mergeClassName = <T,>(
  className: ((props: T) => string) | string | undefined,
  base: string,
) =>
  typeof className === 'function'
    ? (props: T) => cn(base, className(props)) ?? ''
    : (cn(base, className) ?? '');

export interface KanbanRootProps extends Omit<
  ComponentPropsWithRef<typeof ScrollShadow>,
  'orientation' | 'size'
> {
  size?: KanbanSize;
}
export function KanbanRoot({
  children,
  className,
  size = 'md',
  ...props
}: KanbanRootProps): ReactElement {
  const context = useMemo(
    () => ({
      cardContentClass: `kanban__card-content--${size}`,
      cardClass: `kanban__card--${size}`,
      cardListClass: `kanban__card-list--${size}`,
    }),
    [size],
  );
  return (
    <Context value={context}>
      <ScrollShadow
        {...props}
        className={cn('kanban', `kanban--${size}`, className)}
        data-slot='kanban'
        orientation='horizontal'
      >
        {children}
      </ScrollShadow>
    </Context>
  );
}

export type KanbanColumnProps = ComponentPropsWithRef<'section'>;
export function KanbanColumn({
  children,
  className,
  ...props
}: KanbanColumnProps): ReactElement {
  return (
    <section
      {...props}
      className={cn('kanban__column', className)}
      data-slot='kanban-column'
    >
      {children}
    </section>
  );
}
export type KanbanColumnBodyProps = ComponentPropsWithRef<'div'>;
export function KanbanColumnBody({
  children,
  className,
  ...props
}: KanbanColumnBodyProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('kanban__column-body', className)}
      data-slot='kanban-column-body'
    >
      {children}
    </div>
  );
}
export type KanbanColumnHeaderProps = ComponentPropsWithRef<'header'>;
export function KanbanColumnHeader({
  children,
  className,
  ...props
}: KanbanColumnHeaderProps): ReactElement {
  return (
    <header
      {...props}
      className={cn('kanban__column-header', className)}
      data-slot='kanban-column-header'
    >
      {children}
    </header>
  );
}
export type KanbanColumnActionsProps = ComponentPropsWithRef<'div'>;
export function KanbanColumnActions({
  children,
  className,
  ...props
}: KanbanColumnActionsProps): ReactElement {
  return (
    <div
      {...props}
      className={cn('kanban__column-actions', className)}
      data-slot='kanban-column-actions'
    >
      {children}
    </div>
  );
}
export type KanbanColumnIndicatorProps = ComponentPropsWithRef<'span'>;
export function KanbanColumnIndicator({
  children,
  className,
  ...props
}: KanbanColumnIndicatorProps): ReactElement {
  return (
    <span
      {...props}
      className={cn('kanban__column-indicator', className)}
      data-slot='kanban-column-indicator'
    >
      {children}
    </span>
  );
}
export type KanbanColumnTitleProps = ComponentPropsWithRef<'h3'>;
export function KanbanColumnTitle({
  children,
  className,
  ...props
}: KanbanColumnTitleProps): ReactElement {
  return (
    <h3
      {...props}
      className={cn('kanban__column-title', className)}
      data-slot='kanban-column-title'
    >
      {children}
    </h3>
  );
}
export type KanbanColumnCountProps = ComponentPropsWithRef<'span'>;
export function KanbanColumnCount({
  children,
  className,
  ...props
}: KanbanColumnCountProps): ReactElement {
  return (
    <span
      {...props}
      className={cn('kanban__column-count', className)}
      data-slot='kanban-column-count'
    >
      {children}
    </span>
  );
}

export interface KanbanCardListProps<
  T extends object = object,
> extends GridListProps<T> {}
export function KanbanCardList<T extends object = object>({
  children,
  className,
  renderEmptyState,
  selectionMode = 'none',
  ...props
}: KanbanCardListProps<T>): ReactElement {
  const context = useContext(Context);
  return (
    <GridList
      {...props}
      {...(renderEmptyState
        ? {
            renderEmptyState: (renderProps) => (
              <div className='kanban__empty' data-slot='kanban-empty'>
                {renderEmptyState(renderProps)}
              </div>
            ),
          }
        : {})}
      className={mergeClassName(
        className,
        cn('kanban__card-list', context.cardListClass) ?? '',
      )}
      data-slot='kanban-card-list'
      selectionMode={selectionMode}
    >
      {children}
    </GridList>
  );
}

export interface KanbanCardProps<
  T extends object = object,
> extends GridListItemProps<T> {}
export function KanbanCard<T extends object = object>({
  children,
  className,
  ...props
}: KanbanCardProps<T>): ReactElement {
  const context = useContext(Context);
  return (
    <GridListItem
      {...props}
      className={mergeClassName(
        className,
        cn('kanban__card', context.cardClass) ?? 'kanban__card',
      )}
      data-slot='kanban-card'
    >
      {(renderProps) => (
        <motion.div
          className={cn('kanban__card-content', context.cardContentClass)}
          data-slot='kanban-card-content'
          layout
          transition={{ bounce: 0.15, duration: 0.35, type: 'spring' }}
        >
          {typeof children === 'function' ? children(renderProps) : children}
        </motion.div>
      )}
    </GridListItem>
  );
}

export interface KanbanDropIndicatorProps extends DropIndicatorProps {
  height?: number;
}
export function KanbanDropIndicator({
  className,
  height,
  style,
  ...props
}: KanbanDropIndicatorProps): ReactElement {
  const resolvedStyle =
    height && height > 0
      ? typeof style === 'function'
        ? (renderProps: Parameters<typeof style>[0]) => ({
            ...style(renderProps),
            '--kanban-drop-height': `${height}px`,
          })
        : ({
            ...style,
            '--kanban-drop-height': `${height}px`,
          } as CSSProperties & { '--kanban-drop-height': string })
      : style;
  return (
    <DropIndicator
      {...props}
      {...(resolvedStyle ? { style: resolvedStyle } : {})}
      className={mergeClassName(className, 'kanban__drop-indicator')}
      data-slot='kanban-drop-indicator'
    />
  );
}
export type KanbanScrollShadowProps = ComponentPropsWithRef<
  typeof ScrollShadow
>;
export function KanbanScrollShadow({
  children,
  className,
  ...props
}: KanbanScrollShadowProps): ReactElement {
  return (
    <ScrollShadow
      {...props}
      className={cn('kanban__scroll-shadow', className)}
      data-slot='kanban-scroll-shadow'
    >
      {children}
    </ScrollShadow>
  );
}
export type KanbanDragHandleProps = ComponentPropsWithRef<typeof Button>;
export function KanbanDragHandle({
  children,
  className,
  ...props
}: KanbanDragHandleProps): ReactElement {
  return (
    <Button
      {...props}
      className={mergeClassName(className, 'kanban__drag-handle')}
      data-slot='kanban-drag-handle'
      slot='drag'
    >
      {children ?? '≡'}
    </Button>
  );
}

export interface UseKanbanOptions<T extends object> {
  dragType?: string;
  getColumn: (item: T) => string;
  getKey?: (item: T) => Key;
  initialItems: T[];
  setColumn: (item: T, column: string) => T;
}
export interface UseKanbanReturn<T extends object> {
  addItem: (item: T) => void;
  dragType: string;
  getColumn: (item: T) => string;
  list: ListData<T>;
  moveItem: (key: Key, column: string) => void;
  removeItem: (key: Key) => void;
  setColumn: (item: T, column: string) => T;
  updateItem: (key: Key, item: T | ((item: T) => T)) => void;
}
export function useKanban<T extends object>({
  dragType = 'kanban-item-id',
  getColumn,
  getKey,
  initialItems,
  setColumn,
}: UseKanbanOptions<T>): UseKanbanReturn<T> {
  const list = useListData({
    initialItems,
    ...(getKey ? { getKey } : {}),
  });
  return {
    addItem: (item) => list.append(item),
    dragType,
    getColumn,
    list,
    moveItem: (key, column) => {
      const item = list.getItem(key);
      if (item) list.update(key, setColumn(item, column));
    },
    removeItem: (key) => list.remove(key),
    setColumn,
    updateItem: (key, item) => list.update(key, item),
  };
}

export interface UseKanbanColumnOptions {
  renderDropIndicator?: (target: ItemDropTarget) => ReactNode;
}
export interface UseKanbanColumnReturn<T extends object> {
  dragAndDropHooks: ReturnType<typeof useDragAndDrop<T>>['dragAndDropHooks'];
  items: T[];
}
export function useKanbanColumn<T extends object>(
  kanban: UseKanbanReturn<T>,
  column: string,
  options?: UseKanbanColumnOptions,
): UseKanbanColumnReturn<T> {
  const { dragType, getColumn, list, setColumn } = kanban;
  const items = useMemo(
    () => list.items.filter((item) => getColumn(item) === column),
    [column, getColumn, list.items],
  );
  const renderDropIndicator = options?.renderDropIndicator;
  const { dragAndDropHooks } = useDragAndDrop<T>({
    acceptedDragTypes: [dragType],
    getDropOperation: () => 'move',
    getItems(keys) {
      return [...keys].map((key) => ({
        [dragType]: String(key),
        'text/plain': String(key),
      }));
    },
    async onInsert(event) {
      const keys = await Promise.all(
        event.items
          .filter((item) => item.kind === 'text')
          .map((item) => item.getText(dragType)),
      );
      for (const key of keys) {
        const item = list.getItem(key);
        if (item) list.update(key, setColumn(item, column));
      }
      if (event.target.dropPosition === 'before')
        list.moveBefore(event.target.key, keys);
      else if (event.target.dropPosition === 'after')
        list.moveAfter(event.target.key, keys);
    },
    onReorder(event) {
      if (event.target.dropPosition === 'before')
        list.moveBefore(event.target.key, event.keys);
      else if (event.target.dropPosition === 'after')
        list.moveAfter(event.target.key, event.keys);
    },
    async onRootDrop(event) {
      const keys = await Promise.all(
        event.items
          .filter((item) => item.kind === 'text')
          .map((item) => item.getText(dragType)),
      );
      for (const key of keys) {
        const item = list.getItem(key);
        if (item) list.update(key, setColumn(item, column));
      }
    },
    ...(renderDropIndicator
      ? {
          renderDropIndicator: (target) =>
            target.type === 'item' ? <>{renderDropIndicator(target)}</> : <></>,
        }
      : {}),
  });
  return { dragAndDropHooks, items };
}

export interface UseKanbanCardPlaceholderOptions {
  renderIndicator: (target: ItemDropTarget) => ReactNode;
}
export interface UseKanbanCardPlaceholderReturn {
  renderDropIndicator: (target: ItemDropTarget) => ReactNode;
}
export function useKanbanCardPlaceholder({
  renderIndicator,
}: UseKanbanCardPlaceholderOptions): UseKanbanCardPlaceholderReturn {
  useEffect(() => {
    const updateHeight = () => {
      const dragging = document.querySelector<HTMLElement>('[data-dragging]');
      if (dragging) {
        const height = dragging.getBoundingClientRect().height;
        if (height > 0)
          document.documentElement.style.setProperty(
            '--kanban-drop-height',
            `${height}px`,
          );
      } else
        document.documentElement.style.removeProperty('--kanban-drop-height');
    };
    const observer = new MutationObserver(updateHeight);
    observer.observe(document.body, {
      attributeFilter: ['data-dragging'],
      attributes: true,
      subtree: true,
    });
    return () => {
      observer.disconnect();
      document.documentElement.style.removeProperty('--kanban-drop-height');
    };
  }, []);
  return {
    renderDropIndicator: useCallback(
      (target: ItemDropTarget) => renderIndicator(target),
      [renderIndicator],
    ),
  };
}

/** @deprecated Use `useKanbanCardPlaceholder` to match the public Pro API. */
export const useKanbanDropIndicator: typeof useKanbanCardPlaceholder =
  useKanbanCardPlaceholder;
/** @deprecated Use `UseKanbanCardPlaceholderOptions`. */
export type UseKanbanDropIndicatorOptions = UseKanbanCardPlaceholderOptions;
/** @deprecated Use `UseKanbanCardPlaceholderReturn`. */
export type UseKanbanDropIndicatorReturn = UseKanbanCardPlaceholderReturn;

type KanbanComponent = typeof KanbanRoot & {
  Card: typeof KanbanCard;
  CardList: typeof KanbanCardList;
  Column: typeof KanbanColumn;
  ColumnActions: typeof KanbanColumnActions;
  ColumnBody: typeof KanbanColumnBody;
  ColumnCount: typeof KanbanColumnCount;
  ColumnHeader: typeof KanbanColumnHeader;
  ColumnIndicator: typeof KanbanColumnIndicator;
  ColumnTitle: typeof KanbanColumnTitle;
  DragHandle: typeof KanbanDragHandle;
  DropIndicator: typeof KanbanDropIndicator;
  Root: typeof KanbanRoot;
  ScrollShadow: typeof KanbanScrollShadow;
};
export const Kanban: KanbanComponent = Object.assign(KanbanRoot, {
  Card: KanbanCard,
  CardList: KanbanCardList,
  Column: KanbanColumn,
  ColumnActions: KanbanColumnActions,
  ColumnBody: KanbanColumnBody,
  ColumnCount: KanbanColumnCount,
  ColumnHeader: KanbanColumnHeader,
  ColumnIndicator: KanbanColumnIndicator,
  ColumnTitle: KanbanColumnTitle,
  DragHandle: KanbanDragHandle,
  DropIndicator: KanbanDropIndicator,
  Root: KanbanRoot,
  ScrollShadow: KanbanScrollShadow,
});
