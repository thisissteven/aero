// app/components/chat-aside/changes/diff-workbench.tsx
//
// GitHub-style split view for a multi-file patch: a virtualized file tree on
// the left and a virtualized column of diffs on the right with a persistent
// toolbar describing the file currently at the top of the viewport.

import { cn, IconButton, Skeleton, Tooltip } from '@aero/ui';
import { Copy, Folder, LayoutSplitColumns } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Virtualizer, type VirtualizerHandle } from 'virtua';

import { CodeBlock } from '@/app/components/code-block/code-block';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { useI18n } from '@/app/hooks/i18n';
import { toastPromise } from '@/app/lib/toast';

import { DiffCode } from './diff-block';
import { useDiffViewMode } from './diff-view-context';
import {
  buildFileTree,
  type PatchFile,
  type PatchTreeNode,
  splitPatchByFile,
} from './lib';

const TREE_ROW_HEIGHT = 28;

const STATUS_META: Record<
  PatchFile['status'],
  { letter: string; className: string }
> = {
  added: { letter: 'A', className: 'bg-success/15 text-success' },
  modified: { letter: 'M', className: 'bg-warning/15 text-warning' },
  deleted: { letter: 'D', className: 'bg-danger/15 text-danger' },
  renamed: { letter: 'R', className: 'bg-accent/15 text-accent' },
};

interface FlatTreeNode {
  node: PatchTreeNode;
  depth: number;
}

function flattenTree(
  nodes: PatchTreeNode[],
  depth = 0,
  out: FlatTreeNode[] = [],
): FlatTreeNode[] {
  for (const node of nodes) {
    out.push({ node, depth });
    if (node.type === 'dir') flattenTree(node.children, depth + 1, out);
  }
  return out;
}

function treeNodeKey(item: FlatTreeNode): string {
  return item.node.type === 'file' ? item.node.path : `dir:${item.node.path}`;
}

export function DiffWorkbench({
  patch,
  isLoading,
  emptyLabel,
}: {
  patch?: string | null;
  isLoading?: boolean;
  emptyLabel?: string;
}) {
  const { t } = useI18n();
  const { viewMode, setViewMode } = useDiffViewMode();
  const files = useMemo(() => splitPatchByFile(patch ?? ''), [patch]);
  const tree = useMemo(() => buildFileTree(files), [files]);
  const flatTree = useMemo(() => flattenTree(tree), [tree]);
  const fileRowIndex = useMemo(() => {
    const map = new Map<string, number>();
    flatTree.forEach((item, index) => {
      if (item.node.type === 'file') map.set(item.node.path, index);
    });
    return map;
  }, [flatTree]);

  // Estimate the average diff height so virtua reserves space for unmeasured
  // items and doesn't leave blanks while scrolling.
  const diffItemSize = useMemo(() => {
    if (!files.length) return 400;
    const totalLines = files.reduce((sum, file) => sum + file.lines, 0);
    const average = totalLines / files.length;
    return Math.min(Math.max(Math.round(average * 20) + 80, 200), 1200);
  }, [files]);

  const [activeIndex, setActiveIndex] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const treeScrollRef = useRef<HTMLDivElement>(null);
  const virtualizerRef = useRef<VirtualizerHandle>(null);
  const treeRef = useRef<VirtualizerHandle>(null);

  useEffect(() => {
    setActiveIndex(0);
    virtualizerRef.current?.scrollToIndex(0);
    treeRef.current?.scrollToIndex(0);
  }, [files]);

  // Keep the active file's row in view while scrolling the diffs.
  useEffect(() => {
    const path = files[activeIndex]?.path;
    const rowIndex = path ? fileRowIndex.get(path) : undefined;
    if (rowIndex != null) {
      treeRef.current?.scrollToIndex(rowIndex, { align: 'nearest' });
    }
  }, [activeIndex, files, fileRowIndex]);

  const handleScroll = useCallback((offset: number) => {
    const handle = virtualizerRef.current;
    if (!handle) return;
    // +1 so a scroll position exactly at an item's top selects that item
    // instead of the one before it.
    const index = handle.findItemIndex(offset + 1);
    setActiveIndex((prev) => (prev === index ? prev : index));
  }, []);

  const scrollToFile = useCallback(
    (path: string) => {
      const index = files.findIndex((file) => file.path === path);
      if (index < 0) return;
      setActiveIndex(index);

      const handle = virtualizerRef.current;
      if (!handle) return;
      handle.scrollToIndex(index, { align: 'start' });
      // Re-align once the lazily-measured items above have settled.
      requestAnimationFrame(() => {
        virtualizerRef.current?.scrollToIndex(index, { align: 'start' });
      });
    },
    [files],
  );

  if (isLoading) {
    return <WorkbenchSkeleton />;
  }

  if (!files.length) {
    return (
      <div className='text-muted flex h-full items-center justify-center p-6 text-sm'>
        {emptyLabel ?? t.changesPanel.noChangesToDisplay}
      </div>
    );
  }

  const activeFile = files[Math.min(activeIndex, files.length - 1)];
  const totalAdditions = files.reduce((sum, file) => sum + file.additions, 0);
  const totalDeletions = files.reduce((sum, file) => sum + file.deletions, 0);

  return (
    <div className='flex h-full min-h-0 flex-col md:flex-row'>
      <aside className='border-separator hidden w-72 shrink-0 flex-col border-r md:flex'>
        <div className='border-separator flex shrink-0 items-center gap-2 border-b px-3 py-2 text-xs'>
          <span className='text-foreground font-medium'>
            {t.changesPanel.changeCount(files.length)}
          </span>
          {totalAdditions > 0 && (
            <span className='text-success tabular-nums'>+{totalAdditions}</span>
          )}
          {totalDeletions > 0 && (
            <span className='text-danger tabular-nums'>-{totalDeletions}</span>
          )}
        </div>
        <div
          ref={treeScrollRef}
          className='scrollbar-thin [overflow-anchor:none] min-h-0 flex-1 overflow-y-auto'
        >
          <Virtualizer
            ref={treeRef}
            scrollRef={treeScrollRef}
            data={flatTree}
            itemSize={TREE_ROW_HEIGHT}
            bufferSize={600}
          >
            {(item: FlatTreeNode) => (
              <TreeRow
                key={treeNodeKey(item)}
                item={item}
                isActive={item.node.path === activeFile.path}
                onSelect={scrollToFile}
              />
            )}
          </Virtualizer>
        </div>
      </aside>

      <div className='flex min-h-0 flex-1 flex-col'>
        {/* Mobile file selector */}
        <div className='border-separator scrollbar-none flex shrink-0 gap-1 overflow-x-auto border-b px-2 py-1.5 md:hidden'>
          {files.map((file) => (
            <button
              key={file.path}
              type='button'
              onClick={() => scrollToFile(file.path)}
              className={cn(
                'flex shrink-0 items-center gap-1.5 rounded-md px-2 py-1 text-xs transition-colors',
                file.path === activeFile.path
                  ? 'bg-default text-foreground'
                  : 'text-muted hover:text-foreground',
              )}
            >
              <StatusBadge status={file.status} />
              <span className='max-w-40 truncate'>
                {file.path.split('/').pop()}
              </span>
            </button>
          ))}
        </div>

        <ActiveFileBar
          file={activeFile}
          viewMode={viewMode}
          onToggleViewMode={() =>
            setViewMode(viewMode === 'split' ? 'unified' : 'split')
          }
        />

        <div
          ref={scrollRef}
          className='scrollbar-thin [overflow-anchor:none] min-h-0 flex-1 overflow-y-auto'
        >
          <Virtualizer
            key={patch ?? ''}
            ref={virtualizerRef}
            scrollRef={scrollRef}
            data={files}
            itemSize={diffItemSize}
            bufferSize={2000}
            onScroll={handleScroll}
          >
            {(file: PatchFile) => (
              <FileDiffSection
                key={file.path}
                file={file}
                viewMode={viewMode}
                onViewModeChange={setViewMode}
              />
            )}
          </Virtualizer>
        </div>
      </div>
    </div>
  );
}

function WorkbenchSkeleton() {
  return (
    <div className='flex h-full min-h-0 flex-col md:flex-row'>
      <aside className='border-separator hidden w-72 shrink-0 flex-col border-r md:flex'>
        <div className='border-separator border-b px-3 py-2'>
          <Skeleton className='h-3.5 w-20 rounded' />
        </div>
        <div className='flex flex-col gap-1 p-2'>
          {Array.from({ length: 14 }).map((_, index) => (
            <Skeleton
              key={index}
              className='h-5 rounded'
              style={{ width: `${58 + ((index * 13) % 38)}%` }}
            />
          ))}
        </div>
      </aside>

      <div className='flex min-h-0 flex-1 flex-col'>
        <div className='border-separator border-b px-3 py-2.5'>
          <Skeleton className='h-3.5 w-1/2 rounded' />
        </div>
        <div className='space-y-3 p-4'>
          <Skeleton className='h-3 w-1/3 rounded' />
          <Skeleton className='h-40 w-full rounded-md' />
          <Skeleton className='h-3 w-1/4 rounded' />
          <Skeleton className='h-56 w-full rounded-md' />
        </div>
      </div>
    </div>
  );
}

function ActiveFileBar({
  file,
  viewMode,
  onToggleViewMode,
}: {
  file: PatchFile;
  viewMode: 'split' | 'unified';
  onToggleViewMode: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className='border-separator flex h-9 shrink-0 items-center gap-2 border-b py-1 pl-2 pr-1'>
      <FileTypeIcon filePath={file.path} />
      <span className='min-w-0 flex-1 truncate text-xs'>{file.path}</span>
      <span className='flex shrink-0 items-center gap-1.5 text-xs tabular-nums'>
        {file.additions > 0 && (
          <span className='text-success'>+{file.additions}</span>
        )}
        {file.deletions > 0 && (
          <span className='text-danger'>-{file.deletions}</span>
        )}
        <StatusBadge status={file.status} />
      </span>
      <div className='flex shrink-0 items-center gap-0'>
        <Tooltip>
          <Tooltip.Trigger>
            <IconButton
              aria-label={t.common.copy}
              onPress={() =>
                void toastPromise(navigator.clipboard.writeText(file.patch), {
                  loading: t.common.copy,
                  success: t.common.copied,
                  error: (error) => error.message || t.common.copy,
                })
              }
            >
              <Icon data={Copy} />
            </IconButton>
          </Tooltip.Trigger>
          <Tooltip.Content>{t.common.copy}</Tooltip.Content>
        </Tooltip>
        <Tooltip>
          <Tooltip.Trigger>
            <IconButton
              aria-label='Toggle split view'
              aria-pressed={viewMode === 'split'}
              data-pressed={viewMode === 'split' || undefined}
              className='data-[pressed]:text-foreground data-[pressed]:opacity-100'
              onPress={onToggleViewMode}
            >
              <Icon data={LayoutSplitColumns} />
            </IconButton>
          </Tooltip.Trigger>
          <Tooltip.Content>{t.changesPanel.diff}</Tooltip.Content>
        </Tooltip>
      </div>
    </div>
  );
}

const TreeRow = memo(function TreeRow({
  item,
  isActive,
  onSelect,
}: {
  item: FlatTreeNode;
  isActive: boolean;
  onSelect: (path: string) => void;
}) {
  const { node, depth } = item;
  const style = { height: TREE_ROW_HEIGHT, paddingLeft: 8 + depth * 12 };

  if (node.type === 'dir') {
    return (
      <div
        className='text-muted flex items-center gap-1.5 pr-2 text-xs'
        style={style}
      >
        <Icon data={Folder} size={12} className='shrink-0' />
        <span className='truncate'>{node.name}</span>
      </div>
    );
  }

  return (
    <button
      type='button'
      onClick={() => onSelect(node.path)}
      className={cn(
        'flex w-full items-center gap-1.5 pr-1.5 text-left text-xs transition-colors',
        isActive
          ? 'bg-default text-foreground'
          : 'text-muted hover:bg-default/40 hover:text-foreground',
      )}
      style={style}
    >
      <FileTypeIcon filePath={node.path} />
      <span className='min-w-0 flex-1 truncate'>{node.name}</span>
      {node.file && (
        <span className='flex shrink-0 items-center gap-1 tabular-nums'>
          {node.file.additions > 0 && (
            <span className='text-success'>+{node.file.additions}</span>
          )}
          {node.file.deletions > 0 && (
            <span className='text-danger'>-{node.file.deletions}</span>
          )}
          <StatusBadge status={node.file.status} />
        </span>
      )}
    </button>
  );
});

function StatusBadge({ status }: { status: PatchFile['status'] }) {
  const meta = STATUS_META[status];
  return (
    <span
      className={cn(
        'inline-flex h-4 min-w-4 shrink-0 items-center justify-center rounded px-1 text-[10px] leading-none font-medium',
        meta.className,
      )}
    >
      {meta.letter}
    </span>
  );
}

const FileDiffSection = memo(function FileDiffSection({
  file,
  viewMode,
  onViewModeChange,
}: {
  file: PatchFile;
  viewMode: 'split' | 'unified';
  onViewModeChange: (mode: 'split' | 'unified') => void;
}) {
  return (
    <section className='border-separator border-b last:border-b-0'>
      <div className='border-separator flex h-8 items-center gap-2 border-b px-3 text-xs'>
        <FileTypeIcon filePath={file.path} />
        <span className='min-w-0 flex-1 truncate'>{file.path}</span>
        <span className='flex shrink-0 items-center gap-1.5 tabular-nums'>
          {file.additions > 0 && (
            <span className='text-success'>+{file.additions}</span>
          )}
          {file.deletions > 0 && (
            <span className='text-danger'>-{file.deletions}</span>
          )}
          <StatusBadge status={file.status} />
        </span>
      </div>

      <CodeBlock
        defaultViewMode='unified'
        fitContent
        viewMode={viewMode}
        onViewModeChange={onViewModeChange}
        className='rounded-none border-0'
      >
        <DiffCode patch={file.patch} fitContent />
      </CodeBlock>
    </section>
  );
});
