'use client';

import { cn } from '@aero/ui';
import { FileTree, useFileTreeSelection } from '@pierre/trees/react';
import type { CSSProperties } from 'react';
import { useEffect } from 'react';

import type { UseLazyFileTreeResult } from '@/app/components/chat-aside/files/use-lazy-file-tree';
import { useTheme } from '@/app/providers';

export interface FileExplorerProps extends UseLazyFileTreeResult {
  onOpenFile: (path: string) => void;
  projectName?: string;
  className?: string;
  style?: CSSProperties;
}

export function FileExplorer({
  model,
  onOpenFile,
  projectName,
  className,
  style,
}: FileExplorerProps) {
  const selectedPaths = useFileTreeSelection(model);
  const { resolvedTheme } = useTheme();

  useEffect(() => {
    if (selectedPaths.length !== 1) return;

    const path = selectedPaths[0];
    const item = model.getItem(path);

    if (item && !item.isDirectory()) {
      const cleanPath = path.replace(/\/$/, '');
      onOpenFile(cleanPath);
    }
  }, [selectedPaths, model, onOpenFile]);

  return (
    <div
      className={cn(
        'border-separator flex min-h-0 flex-col border-r',
        className,
      )}
      style={style}
    >
      {projectName ? (
        <div className='border-separator flex h-10 shrink-0 items-center border-b px-3'>
          <span
            className='text-muted truncate text-xs font-medium'
            title={projectName}
          >
            {projectName}
          </span>
        </div>
      ) : null}
      <div className='min-h-0 flex-1'>
        <FileTree
          model={model}
          className='h-full'
          style={
            {
              height: '100%',
              colorScheme: resolvedTheme,
              fontFamily: 'var(--font-sans)',
              '--trees-padding-inline': '4px',

              // Everything inside the panel paints on --surface so it blends
              // with the tab strip and content pane.
              '--trees-bg-override': 'transparent',
              '--trees-bg-muted-override': 'transparent',

              '--trees-fg-override': 'var(--foreground)',
              '--trees-fg-muted-override': 'var(--muted)',

              '--trees-hover-bg-override': 'var(--surface-hover)',
              '--trees-selected-fg-override': 'var(--accent-soft-foreground)',
              '--trees-selected-bg-override': 'var(--accent-soft)',
              '--trees-selected-border-color-override':
                'color-mix(in oklab, var(--accent) 20%, transparent)',
              '--trees-selected-focused-border-color-override':
                'color-mix(in oklab, var(--accent) 20%, transparent)',

              '--trees-focus-ring-color-override': 'var(--focus)',

              '--trees-search-fg-override': 'var(--field-foreground)',
              '--trees-search-bg-override': 'var(--field-background)',

              '--trees-border-color-override': 'var(--separator)',

              '--trees-git-added-color-override': 'var(--success)',
              '--trees-git-modified-color-override': 'var(--warning)',
              '--trees-git-deleted-color-override': 'var(--danger)',
              '--trees-git-renamed-color-override': 'var(--accent)',
              '--trees-git-untracked-color-override': 'var(--success)',
              '--trees-git-ignored-color-override': 'var(--muted)',
              '--trees-git-descendant-color-override': 'var(--muted)',
            } as CSSProperties
          }
        />
      </div>
    </div>
  );
}
