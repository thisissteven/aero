'use client';

import {
  Button,
  Checkbox,
  cn,
  IconChevronRight,
  IconChevronUp,
  Table,
} from '@heroui/react';
import { GripVerticalIcon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import type { CSSProperties, ReactElement, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type {
  DragAndDropHooks,
  Key,
  Selection,
  SortDescriptor,
} from 'react-aria-components';
import {
  TableLayout,
  useDragAndDrop,
  Virtualizer,
} from 'react-aria-components';

export type {
  Selection as DataGridSelection,
  SortDescriptor as DataGridSortDescriptor,
  SortDirection as DataGridSortDirection,
} from 'react-aria-components';

export type DataGridAlign = 'center' | 'end' | 'start';
export type DataGridPinned = 'end' | 'start';
export type DataGridVerticalAlign = 'bottom' | 'middle' | 'top';
export type DataGridVariant = 'primary' | 'secondary';
export type DataGridColumnSize =
  number | `${number}` | `${number}%` | `${number}fr`;
export type DataGridStaticColumnSize = Exclude<
  DataGridColumnSize,
  `${number}fr`
>;

export interface DataGridColumn<T extends object> {
  accessorKey?: keyof T & string;
  align?: DataGridAlign;
  allowsResizing?: boolean;
  allowsSorting?: boolean;
  cell?: (item: T, column: DataGridColumn<T>) => ReactNode;
  cellClassName?: string;
  header:
    | ReactNode
    | ((props: {
        sortDirection?: 'ascending' | 'descending' | undefined;
      }) => ReactNode);
  headerClassName?: string;
  id: string;
  isHidden?: boolean;
  isRowHeader?: boolean;
  maxWidth?: DataGridStaticColumnSize;
  minWidth?: DataGridStaticColumnSize;
  pinned?: DataGridPinned;
  sortFn?: (a: T, b: T) => number;
  width?: DataGridColumnSize;
}

export interface DataGridReorderEvent<T extends object> {
  keys: Set<Key>;
  reorderedData: T[];
  target: { dropPosition: 'after' | 'before'; key: Key };
}

export interface DataGridProps<T extends object> {
  'aria-label': string;
  allowsColumnResize?: boolean;
  className?: string;
  columns: DataGridColumn<T>[];
  contentClassName?: string;
  data: T[];
  defaultExpandedKeys?: Selection;
  defaultSelectedKeys?: Selection;
  defaultSortDescriptor?: SortDescriptor;
  disabledKeys?: Iterable<Key>;
  dragAndDropHooks?: DragAndDropHooks;
  expandedKeys?: Selection;
  getChildren?: (item: T) => T[] | undefined;
  getRowId: (item: T) => Key;
  headingHeight?: number;
  isLoadingMore?: boolean;
  loadMoreContent?: ReactNode;
  onColumnResize?: (widths: Map<Key, DataGridColumnSize>) => void;
  onColumnResizeEnd?: (widths: Map<Key, DataGridColumnSize>) => void;
  onExpandedChange?: (keys: Selection) => void;
  onLoadMore?: () => void;
  onReorder?: (event: DataGridReorderEvent<T>) => void;
  onRowAction?: (key: Key) => void;
  onSelectionChange?: (keys: Selection) => void;
  onSortChange?: (descriptor: SortDescriptor) => void;
  renderEmptyState?: () => ReactNode;
  rowHeight?: number;
  scrollContainerClassName?: string;
  selectedKeys?: Selection;
  selectionBehavior?: 'replace' | 'toggle';
  selectionMode?: 'multiple' | 'none' | 'single';
  showSelectionCheckboxes?: boolean;
  sortDescriptor?: SortDescriptor;
  treeColumn?: string;
  treeIndent?: number;
  variant?: DataGridVariant;
  verticalAlign?: DataGridVerticalAlign;
  virtualized?: boolean;
}

function compare<T extends object>(
  a: T,
  b: T,
  column: DataGridColumn<T>,
): number {
  if (column.sortFn) return column.sortFn(a, b);
  if (!column.accessorKey) return 0;
  const left = a[column.accessorKey];
  const right = b[column.accessorKey];
  if (typeof left === 'number' && typeof right === 'number')
    return left - right;
  return String(left ?? '').localeCompare(String(right ?? ''));
}

function reorder<T extends object>(
  data: T[],
  keys: Set<Key>,
  target: Key,
  position: 'after' | 'before',
  getRowId: (item: T) => Key,
): T[] {
  const moving = data.filter((item) => keys.has(getRowId(item)));
  const remaining = data.filter((item) => !keys.has(getRowId(item)));
  const targetIndex = remaining.findIndex((item) => getRowId(item) === target);
  remaining.splice(
    position === 'before' ? targetIndex : targetIndex + 1,
    0,
    ...moving,
  );
  return remaining;
}

function SelectionCheckbox({ all = false }: { all?: boolean }): ReactElement {
  return (
    <Checkbox
      aria-label={all ? 'Select all' : 'Select row'}
      slot='selection'
      variant='secondary'
    >
      <Checkbox.Content>
        <Checkbox.Control>
          <Checkbox.Indicator />
        </Checkbox.Control>
      </Checkbox.Content>
    </Checkbox>
  );
}

function DataGridInner<T extends object>({
  allowsColumnResize = false,
  'aria-label': ariaLabel,
  className,
  columns,
  contentClassName,
  data,
  defaultExpandedKeys,
  defaultSelectedKeys,
  defaultSortDescriptor,
  disabledKeys,
  dragAndDropHooks,
  expandedKeys,
  getChildren,
  getRowId,
  headingHeight = 36,
  isLoadingMore = false,
  loadMoreContent,
  onColumnResize,
  onColumnResizeEnd,
  onExpandedChange,
  onLoadMore,
  onReorder,
  onRowAction,
  onSelectionChange,
  onSortChange,
  renderEmptyState,
  rowHeight = 42,
  scrollContainerClassName,
  selectedKeys,
  selectionBehavior = 'toggle',
  selectionMode = 'none',
  showSelectionCheckboxes = false,
  sortDescriptor,
  treeColumn,
  treeIndent = 20,
  variant = 'primary',
  verticalAlign = 'middle',
  virtualized = false,
}: DataGridProps<T>): ReactElement {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [internalSort, setInternalSort] = useState<SortDescriptor | undefined>(
    defaultSortDescriptor,
  );
  const activeSort = sortDescriptor ?? internalSort;
  const sortedData = useMemo(() => {
    if (!activeSort?.column || sortDescriptor) return data;
    const column = columns.find((item) => item.id === activeSort.column);
    if (!column) return data;
    const result = [...data];
    // oxlint-disable-next-line unicorn/no-array-sort -- ES2022 package target does not include toSorted.
    return result.sort(
      (a, b) =>
        compare(a, b, column) *
        (activeSort.direction === 'descending' ? -1 : 1),
    );
  }, [activeSort, columns, data, sortDescriptor]);
  const handleSort = useCallback(
    (descriptor: SortDescriptor) => {
      if (sortDescriptor === undefined) setInternalSort(descriptor);
      onSortChange?.(descriptor);
    },
    [onSortChange, sortDescriptor],
  );
  const { dragAndDropHooks: reorderHooks } = useDragAndDrop({
    getItems: (keys) => [...keys].map((key) => ({ 'text/plain': String(key) })),
    onReorder: (event) => {
      if (
        !onReorder ||
        (event.target.dropPosition !== 'before' &&
          event.target.dropPosition !== 'after')
      )
        return;
      const keys = new Set(event.keys);
      onReorder({
        keys,
        reorderedData: reorder(
          sortedData,
          keys,
          event.target.key,
          event.target.dropPosition,
          getRowId,
        ),
        target: {
          dropPosition: event.target.dropPosition,
          key: event.target.key,
        },
      });
    },
  });
  const activeDragHooks =
    dragAndDropHooks ?? (onReorder ? reorderHooks : undefined);
  const columnStateKey = columns
    .map((column) => `${column.id}:${column.isHidden ? 'hidden' : 'visible'}`)
    .join('|');
  const visibleColumnDisplay = virtualized ? 'flex' : 'table-cell';
  const columnVisibilityStyles = Object.fromEntries(
    columns.map((column, index) => [
      `--data-grid-column-${index}-display`,
      column.isHidden ? 'none' : visibleColumnDisplay,
    ]),
  ) as CSSProperties;
  const hasDragHandle = Boolean(activeDragHooks);
  const hasTree = typeof getChildren === 'function';
  const hierarchyColumn =
    treeColumn ??
    columns.find((column) => column.isRowHeader)?.id ??
    columns[0]?.id;
  const hasPinnedStart = columns.some((column) => column.pinned === 'start');
  const hasPinnedEnd = columns.some((column) => column.pinned === 'end');
  useEffect(() => {
    const root = rootRef.current;
    const scroller = root?.querySelector<HTMLElement>(
      "[data-slot='table-scroll-container']",
    );
    if (!root || !scroller || (!hasPinnedStart && !hasPinnedEnd)) return;
    const update = () => {
      root.toggleAttribute(
        'data-pinned-start-detached',
        hasPinnedStart && Math.abs(scroller.scrollLeft) > 1,
      );
      root.toggleAttribute(
        'data-pinned-end-detached',
        hasPinnedEnd &&
          scroller.scrollWidth -
            scroller.clientWidth -
            Math.abs(scroller.scrollLeft) >
            1,
      );
    };
    update();
    scroller.addEventListener('scroll', update, { passive: true });
    return () => scroller.removeEventListener('scroll', update);
  }, [hasPinnedEnd, hasPinnedStart]);
  let startOffset = hasDragHandle ? 32 : 0;
  if (showSelectionCheckboxes && selectionMode !== 'none') startOffset += 40;
  const endOffsets = new Map<string, number>();
  let endOffset = 0;
  const reversedColumns = [...columns];
  // oxlint-disable-next-line unicorn/no-array-reverse -- ES2022 package target does not include toReversed.
  reversedColumns.reverse();
  for (const column of reversedColumns)
    if (column.pinned === 'end') {
      endOffsets.set(column.id, endOffset);
      endOffset +=
        typeof column.width === 'number'
          ? column.width
          : typeof column.minWidth === 'number'
            ? column.minWidth
            : 0;
    }
  const startOffsets = new Map<string, number>();
  for (const column of columns)
    if (column.pinned === 'start') {
      startOffsets.set(column.id, startOffset);
      startOffset +=
        typeof column.width === 'number'
          ? column.width
          : typeof column.minWidth === 'number'
            ? column.minWidth
            : 0;
    }
  const renderRow = (item: T): ReactElement => {
    const children = getChildren?.(item) ?? [];
    return (
      <Table.Row id={getRowId(item)}>
        {hasDragHandle ? (
          <Table.Cell className='data-grid__drag-handle-cell'>
            <Button
              isIconOnly
              className='data-grid__drag-handle'
              size='sm'
              slot='drag'
              variant='ghost'
            >
              <HugeiconsIcon
                className='size-4'
                icon={GripVerticalIcon}
                strokeWidth={2}
              />
            </Button>
          </Table.Cell>
        ) : null}
        {showSelectionCheckboxes && selectionMode !== 'none' ? (
          <Table.Cell
            {...(hasPinnedStart
              ? { 'data-pinned': 'start', style: { insetInlineStart: 0 } }
              : {})}
            className='data-grid__selection-cell'
          >
            <SelectionCheckbox />
          </Table.Cell>
        ) : null}
        {columns.map((column, index) => {
          const content = column.cell
            ? column.cell(item, column)
            : column.accessorKey
              ? String(item[column.accessorKey] ?? '')
              : null;
          const pinnedStyle =
            column.pinned === 'start'
              ? { insetInlineStart: startOffsets.get(column.id) }
              : column.pinned === 'end'
                ? { insetInlineEnd: endOffsets.get(column.id) }
                : undefined;
          const tree = hasTree && column.id === hierarchyColumn;
          return (
            <Table.Cell
              {...(column.cellClassName
                ? { className: column.cellClassName }
                : {})}
              {...(column.align ? { 'data-align': column.align } : {})}
              {...(column.pinned ? { 'data-pinned': column.pinned } : {})}
              style={{
                ...pinnedStyle,
                display: `var(--data-grid-column-${index}-display, table-cell)`,
              }}
              key={column.id}
            >
              {tree
                ? ({ hasChildItems, isDisabled, isExpanded, level }) => (
                    <span
                      className='data-grid__tree-cell'
                      {...(treeIndent && level > 1
                        ? {
                            style: {
                              paddingInlineStart: (level - 1) * treeIndent,
                            },
                          }
                        : {})}
                    >
                      {hasChildItems ? (
                        <Button
                          isIconOnly
                          aria-label={
                            isExpanded ? 'Collapse row' : 'Expand row'
                          }
                          className='data-grid__tree-toggle'
                          isDisabled={isDisabled}
                          size='sm'
                          slot='chevron'
                          variant='ghost'
                        >
                          <IconChevronRight
                            aria-hidden='true'
                            className='data-grid__tree-toggle-icon'
                            data-expanded={isExpanded || undefined}
                          />
                        </Button>
                      ) : (
                        <span
                          aria-hidden
                          className='data-grid__tree-toggle-spacer'
                        />
                      )}
                      {content}
                    </span>
                  )
                : content}
            </Table.Cell>
          );
        })}
        {children.length ? (
          <Table.Collection dependencies={[columnStateKey]} items={children}>
            {(child) => renderRow(child)}
          </Table.Collection>
        ) : null}
      </Table.Row>
    );
  };
  const tableContent = (
    <Table.Content
      {...(contentClassName ? { className: contentClassName } : {})}
      {...(defaultExpandedKeys ? { defaultExpandedKeys } : {})}
      {...(defaultSelectedKeys ? { defaultSelectedKeys } : {})}
      {...(disabledKeys ? { disabledKeys } : {})}
      {...(activeDragHooks ? { dragAndDropHooks: activeDragHooks } : {})}
      {...(expandedKeys ? { expandedKeys } : {})}
      {...(selectedKeys ? { selectedKeys } : {})}
      {...(selectionMode === 'none'
        ? {}
        : { selectionBehavior, selectionMode })}
      {...(activeSort ? { sortDescriptor: activeSort } : {})}
      {...(hasTree && hierarchyColumn ? { treeColumn: hierarchyColumn } : {})}
      {...(onExpandedChange ? { onExpandedChange } : {})}
      {...(onRowAction ? { onRowAction } : {})}
      {...(onSelectionChange ? { onSelectionChange } : {})}
      {...(columns.some((column) => column.allowsSorting)
        ? { onSortChange: handleSort }
        : {})}
      aria-label={ariaLabel}
    >
      <Table.Header dependencies={[columnStateKey]}>
        {hasDragHandle ? (
          <Table.Column
            className='data-grid__drag-handle-column'
            maxWidth={32}
            minWidth={32}
            width={32}
          />
        ) : null}
        {showSelectionCheckboxes && selectionMode !== 'none' ? (
          <Table.Column
            className='data-grid__selection-column'
            maxWidth={40}
            minWidth={40}
            width={40}
          >
            {selectionMode === 'multiple' ? <SelectionCheckbox all /> : null}
          </Table.Column>
        ) : null}
        {columns.map((column, index) => {
          const pinnedStyle =
            column.pinned === 'start'
              ? { insetInlineStart: startOffsets.get(column.id) }
              : column.pinned === 'end'
                ? { insetInlineEnd: endOffsets.get(column.id) }
                : undefined;
          return (
            <Table.Column
              {...(column.allowsSorting === undefined
                ? {}
                : { allowsSorting: column.allowsSorting })}
              {...(column.headerClassName
                ? { className: column.headerClassName }
                : {})}
              {...(column.align ? { 'data-align': column.align } : {})}
              {...(column.pinned ? { 'data-pinned': column.pinned } : {})}
              {...(column.isRowHeader === undefined
                ? {}
                : { isRowHeader: column.isRowHeader })}
              {...(column.maxWidth === undefined
                ? {}
                : { maxWidth: column.maxWidth })}
              {...(column.minWidth === undefined
                ? {}
                : { minWidth: column.minWidth })}
              style={{
                ...pinnedStyle,
                display: `var(--data-grid-column-${index}-display, table-cell)`,
              }}
              {...(column.width === undefined ? {} : { width: column.width })}
              id={column.id}
              key={column.id}
            >
              {({ sortDirection }) => (
                <>
                  {column.allowsSorting ? (
                    <span data-slot='data-grid-sort-header'>
                      {typeof column.header === 'function'
                        ? column.header({ sortDirection })
                        : column.header}
                      {sortDirection ? (
                        <IconChevronUp
                          aria-hidden='true'
                          className='data-grid__sort-icon'
                          data-direction={sortDirection}
                          data-slot='data-grid-sort-icon'
                        />
                      ) : null}
                    </span>
                  ) : typeof column.header === 'function' ? (
                    column.header({ sortDirection })
                  ) : (
                    column.header
                  )}
                  {allowsColumnResize && column.allowsResizing !== false ? (
                    <Table.ColumnResizer />
                  ) : null}
                </>
              )}
            </Table.Column>
          );
        })}
      </Table.Header>
      <Table.Body
        {...(renderEmptyState
          ? {
              renderEmptyState: () => (
                <div
                  className='data-grid__empty-state'
                  data-slot='data-grid-empty-state'
                >
                  {renderEmptyState()}
                </div>
              ),
            }
          : {})}
      >
        <Table.Collection dependencies={[columnStateKey]} items={sortedData}>
          {(item: T) => renderRow(item)}
        </Table.Collection>
        {onLoadMore ? (
          <Table.LoadMore isLoading={isLoadingMore} onLoadMore={onLoadMore}>
            <Table.LoadMoreContent>{loadMoreContent}</Table.LoadMoreContent>
          </Table.LoadMore>
        ) : null}
      </Table.Body>
    </Table.Content>
  );
  const resizable = allowsColumnResize ? (
    <Table.ResizableContainer
      {...(onColumnResize ? { onResize: onColumnResize } : {})}
      {...(onColumnResizeEnd ? { onResizeEnd: onColumnResizeEnd } : {})}
    >
      {tableContent}
    </Table.ResizableContainer>
  ) : (
    tableContent
  );
  const root = (
    <Table
      ref={rootRef}
      className={cn('data-grid', className) ?? 'data-grid'}
      data-slot='data-grid'
      data-vertical-align={verticalAlign}
      style={columnVisibilityStyles}
      variant={variant}
    >
      <Table.ScrollContainer
        {...(scrollContainerClassName
          ? { className: scrollContainerClassName }
          : {})}
      >
        {resizable}
      </Table.ScrollContainer>
    </Table>
  );
  return virtualized ? (
    <Virtualizer
      layout={TableLayout}
      layoutOptions={{ headingHeight, rowHeight }}
    >
      {root}
    </Virtualizer>
  ) : (
    root
  );
}

export const DataGrid: typeof DataGridInner = DataGridInner;
