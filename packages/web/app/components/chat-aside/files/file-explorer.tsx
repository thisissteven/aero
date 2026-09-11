import { FileTree, useFileTreeSelection } from '@pierre/trees/react';
import { useEffect } from 'react';

import { UseLazyFileTreeResult } from '@/app/components/chat-aside/files/use-lazy-file-tree';
import { useTheme } from '@/app/providers';

export interface FileExplorerProps extends UseLazyFileTreeResult {
  onOpenFile: (path: string) => void;
  className?: string;
}

export function FileExplorer({
  model,
  onOpenFile,
  className,
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
    <div className={className}>
      <FileTree
        model={model}
        className='border-separator h-full border-l pt-1'
        style={
          {
            height: '100%',
            colorScheme: resolvedTheme,
            fontFamily: 'var(--font-sans)',

            '--trees-padding-inline': '4px',

            // Base
            '--trees-bg-override': 'var(--background)',
            '--trees-fg-override': 'var(--foreground)',
            '--trees-fg-muted-override': 'var(--muted)',
            '--trees-bg-muted-override': 'var(--background-secondary)',

            // Hover / selection
            '--trees-hover-bg-override': 'var(--surface-hover)',
            '--trees-selected-fg-override': 'var(--accent-soft-foreground)',
            '--trees-selected-bg-override': 'var(--accent-soft)',
            '--trees-selected-border-color-override':
              'color-mix(in oklab, var(--accent) 20%, transparent)',
            '--trees-selected-focused-border-color-override':
              'color-mix(in oklab, var(--accent) 20%, transparent)',

            // Focus
            '--trees-focus-ring-color-override': 'var(--focus)',

            // Search / input
            '--trees-search-fg-override': 'var(--field-foreground)',
            '--trees-search-bg-override': 'var(--field-background)',

            // Borders
            '--trees-border-color-override': 'var(--border)',

            // Git status
            '--trees-git-added-color-override': 'var(--success)',
            '--trees-git-modified-color-override': 'var(--warning)',
            '--trees-git-deleted-color-override': 'var(--danger)',
            '--trees-git-renamed-color-override': 'var(--accent)',
            '--trees-git-untracked-color-override': 'var(--success)',
            '--trees-git-ignored-color-override': 'var(--muted)',
            '--trees-git-descendant-color-override': 'var(--muted)',
          } as React.CSSProperties
        }
      />
    </div>
  );
}
