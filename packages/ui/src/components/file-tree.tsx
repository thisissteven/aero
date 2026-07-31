'use client';

import { Checkbox, cn } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement, ReactNode } from 'react';
import {
  Children,
  cloneElement,
  createContext,
  isValidElement,
  useCallback,
  useContext,
  useMemo,
} from 'react';
import {
  Button,
  type DragAndDropHooks,
  type DropTarget,
  type Key,
  Tree,
  TreeHeader,
  TreeItem,
  TreeItemContent,
  type TreeItemProps,
  type TreeProps,
  TreeSection,
  useDragAndDrop,
} from 'react-aria-components';

export type FileTreeSize = 'lg' | 'md' | 'sm';
export interface FileTreeRootProps<
  T extends object = object,
> extends TreeProps<T> {
  reduceMotion?: boolean;
  showGuideLines?: boolean | 'hover';
  size?: FileTreeSize;
}
interface FileTreeContextValue {
  guideLineClass: string;
  itemClass: string;
  reduceMotion: boolean;
}
const Context = createContext<FileTreeContextValue>({
  guideLineClass: '',
  itemClass: 'file-tree__item--md',
  reduceMotion: false,
});

export function FileTreeRoot<T extends object = object>({
  className,
  reduceMotion = false,
  showGuideLines = true,
  size = 'md',
  ...props
}: FileTreeRootProps<T>): ReactElement {
  const guideLineClass =
    showGuideLines === 'hover'
      ? 'file-tree__guide-line--hover'
      : showGuideLines
        ? ''
        : 'file-tree__guide-line--none';
  const value = useMemo(
    () => ({
      guideLineClass,
      itemClass: `file-tree__item--${size}`,
      reduceMotion,
    }),
    [guideLineClass, reduceMotion, size],
  );

  return (
    <Context value={value}>
      <Tree
        {...props}
        className={
          typeof className === 'function'
            ? (renderProps) =>
                cn(`file-tree file-tree--${size}`, className(renderProps)) ?? ''
            : (cn(`file-tree file-tree--${size}`, className) ?? '')
        }
        data-reduce-motion={reduceMotion || undefined}
        data-slot='file-tree'
      />
    </Context>
  );
}

export interface FileTreeItemRenderProps {
  allowsDragging: boolean;
  hasChildItems: boolean;
  isExpanded: boolean;
}
export interface FileTreeItemProps<T extends object = object> extends Omit<
  TreeItemProps<T>,
  'title'
> {
  dragIcon?: false | ReactNode;
  icon?: ((props: FileTreeItemRenderProps) => ReactNode) | ReactNode;
  title: ReactNode;
}
export function FileTreeItem<T extends object = object>({
  children,
  className,
  dragIcon,
  icon,
  title,
  ...props
}: FileTreeItemProps<T>): ReactElement {
  const context = useContext(Context);
  let indicator: ReactElement | null = null;
  const childItems: ReactNode[] = [];

  Children.forEach(children, (child) => {
    if (isValidElement(child) && child.type === FileTreeIndicator)
      indicator = child;
    else childItems.push(child);
  });

  return (
    <TreeItem
      {...props}
      className={
        typeof className === 'function'
          ? (renderProps) =>
              cn(
                'file-tree__item',
                context.itemClass,
                className(renderProps),
              ) ?? ''
          : (cn('file-tree__item', context.itemClass, className) ?? '')
      }
      data-slot='file-tree-item'
    >
      <TreeItemContent>
        {({
          allowsDragging,
          hasChildItems,
          isExpanded,
          level,
          selectionMode,
        }) => {
          const renderedIcon =
            typeof icon === 'function'
              ? icon({
                  allowsDragging: Boolean(allowsDragging),
                  hasChildItems,
                  isExpanded,
                })
              : icon;
          const showCheckbox = selectionMode === 'multiple';

          return (
            <div
              className='file-tree__item-content'
              data-slot='file-tree-item-content'
            >
              {Array.from({ length: level - 1 }, (_, index) => (
                <div
                  aria-hidden='true'
                  className={cn(
                    'file-tree__guide-line',
                    context.guideLineClass,
                  )}
                  data-slot='file-tree-guide-line'
                  key={index}
                  style={{
                    left: `calc(var(--file-tree-item-px) + var(--file-tree-chevron-offset, 0px) + ${index} * var(--file-tree-indent) + var(--file-tree-indent) / 2)`,
                  }}
                />
              ))}
              {allowsDragging && dragIcon !== false ? (
                <Button
                  className='file-tree__drag-handle'
                  data-slot='file-tree-drag-handle'
                  slot='drag'
                >
                  {dragIcon ?? <GripIcon />}
                </Button>
              ) : null}
              {showCheckbox ? (
                <span
                  className='file-tree__checkbox'
                  data-slot='file-tree-checkbox'
                >
                  <Checkbox aria-label='Select' slot='selection'>
                    <Checkbox.Content>
                      <Checkbox.Control>
                        <Checkbox.Indicator />
                      </Checkbox.Control>
                    </Checkbox.Content>
                  </Checkbox>
                </span>
              ) : null}
              <Button
                className='file-tree__chevron'
                data-slot='file-tree-chevron'
                slot='chevron'
              >
                {indicator ?? <FileTreeIndicator />}
              </Button>
              {hasChildItems || renderedIcon ? (
                <span className='file-tree__icon' data-slot='file-tree-icon'>
                  {renderedIcon}
                </span>
              ) : null}
              <span className='file-tree__label' data-slot='file-tree-label'>
                {title}
              </span>
            </div>
          );
        }}
      </TreeItemContent>
      {childItems}
    </TreeItem>
  );
}

export interface FileTreeIndicatorProps extends ComponentPropsWithRef<'svg'> {
  children?: ReactNode;
}
export function FileTreeIndicator({
  children,
  className,
  ...props
}: FileTreeIndicatorProps): ReactElement {
  if (
    children &&
    isValidElement<FileTreeIndicatorProps & { 'data-slot'?: string }>(children)
  )
    return cloneElement(children, {
      ...props,
      className:
        cn('file-tree__indicator', children.props.className, className) ?? '',
      'data-slot': 'file-tree-indicator',
    });

  return (
    <svg
      aria-hidden='true'
      className={cn('file-tree__indicator', className)}
      data-slot='file-tree-indicator'
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      {...props}
    >
      <path
        clipRule='evenodd'
        d='M6.705 11.823a.73.73 0 0 1-1.205-.552V4.729a.73.73 0 0 1 1.205-.552L10.214 7.2a1 1 0 0 1 .347.757v.084a1 1 0 0 1-.347.757z'
        fill='currentColor'
        fillRule='evenodd'
      />
    </svg>
  );
}

export type FileTreeSectionProps<T extends object = object> =
  ComponentPropsWithRef<typeof TreeSection<T>>;
export function FileTreeSection<T extends object = object>({
  className,
  ...props
}: FileTreeSectionProps<T>): ReactElement {
  return (
    <TreeSection
      {...props}
      className={cn('file-tree__section', className) ?? ''}
      data-slot='file-tree-section'
    />
  );
}
export type FileTreeHeaderProps = ComponentPropsWithRef<typeof TreeHeader>;
export function FileTreeHeader({
  className,
  ...props
}: FileTreeHeaderProps): ReactNode {
  return (
    <TreeHeader
      {...props}
      className={cn('file-tree__section-header', className) ?? ''}
      data-slot='file-tree-section-header'
    />
  );
}

function GripIcon(): ReactElement {
  return (
    <svg
      aria-hidden='true'
      fill='none'
      height='16'
      stroke='currentColor'
      strokeLinecap='round'
      strokeLinejoin='round'
      strokeWidth='2'
      viewBox='0 0 24 24'
      width='16'
    >
      {[5, 12, 19].flatMap((cy) =>
        [9, 15].map((cx) => (
          <circle cx={cx} cy={cy} key={`${cx}-${cy}`} r='1' />
        )),
      )}
    </svg>
  );
}

export interface TreeNode {
  children?: TreeNode[];
  id: Key;
}
export interface UseFileTreeOptions<T extends TreeNode> {
  isLeaf?: (node: T) => boolean;
  items: T[];
}
export interface UseFileTreeResult<T extends TreeNode> {
  expandableKeys: Key[];
  filterTree: (predicate: (node: T) => boolean) => T[];
  leaves: T[];
}
export function useFileTree<T extends TreeNode>({
  isLeaf = (node) => !node.children || node.children.length === 0,
  items,
}: UseFileTreeOptions<T>): UseFileTreeResult<T> {
  const expandableKeys = useMemo(() => {
    const keys: Key[] = [];
    const visit = (nodes: T[]) => {
      for (const node of nodes) {
        if (!isLeaf(node)) keys.push(node.id);
        if (node.children) visit(node.children as T[]);
      }
    };
    visit(items);
    return keys;
  }, [isLeaf, items]);
  const leaves = useMemo(() => {
    const result: T[] = [];
    const visit = (nodes: T[]) => {
      for (const node of nodes) {
        if (isLeaf(node)) result.push(node);
        else if (node.children) visit(node.children as T[]);
      }
    };
    visit(items);
    return result;
  }, [isLeaf, items]);
  const filterTree = useCallback(
    (predicate: (node: T) => boolean): T[] => {
      const visit = (nodes: T[]): T[] =>
        nodes.flatMap((node) => {
          if (isLeaf(node)) return predicate(node) ? [node] : [];
          const children = visit((node.children ?? []) as T[]);
          return children.length ? [{ ...node, children } as T] : [];
        });
      return visit(items);
    },
    [isLeaf, items],
  );
  return { expandableKeys, filterTree, leaves };
}

export interface TreeDataManager {
  getItem: (key: Key) => { children?: unknown[] } | null | undefined;
  move: (key: Key, parentKey: Key, index: number) => void;
  moveAfter: (targetKey: Key, keys: Set<Key>) => void;
  moveBefore: (targetKey: Key, keys: Set<Key>) => void;
}
export interface UseFileTreeDragOptions {
  getItems?: (keys: Set<Key>) => Array<Record<string, string>>;
  onMove?: (keys: Set<Key>, target: DropTarget) => void;
  tree: TreeDataManager;
}
export interface UseFileTreeDragResult {
  dragAndDropHooks: DragAndDropHooks<object>;
}
export function useFileTreeDrag({
  getItems,
  onMove,
  tree,
}: UseFileTreeDragOptions): UseFileTreeDragResult {
  const { dragAndDropHooks } = useDragAndDrop({
    getItems:
      getItems ??
      ((keys) => [...keys].map((key) => ({ 'text/plain': String(key) }))),
    onMove(event) {
      if (event.target.dropPosition === 'before')
        tree.moveBefore(event.target.key, event.keys);
      else if (event.target.dropPosition === 'after')
        tree.moveAfter(event.target.key, event.keys);
      else if (event.target.dropPosition === 'on') {
        const target = tree.getItem(event.target.key);
        const index = target?.children?.length ?? 0;
        [...event.keys].forEach((key, offset) =>
          tree.move(key, event.target.key, index + offset),
        );
      }
      onMove?.(event.keys, event.target);
    },
  });
  return { dragAndDropHooks };
}

type FileTreeComponent = typeof FileTreeRoot & {
  Header: typeof FileTreeHeader;
  Indicator: typeof FileTreeIndicator;
  Item: typeof FileTreeItem;
  Root: typeof FileTreeRoot;
  Section: typeof FileTreeSection;
};
export const FileTree: FileTreeComponent = Object.assign(FileTreeRoot, {
  Header: FileTreeHeader,
  Indicator: FileTreeIndicator,
  Item: FileTreeItem,
  Root: FileTreeRoot,
  Section: FileTreeSection,
});
