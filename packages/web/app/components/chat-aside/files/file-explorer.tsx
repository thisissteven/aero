'use client';

import { cn } from '@aero/ui';
import { IconFilePlus, IconFolderPlus, IconSearch } from '@pierre/icons';
import { FileTree, useFileTreeSearch } from '@pierre/trees/react';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useMemo } from 'react';

import type { UseLazyFileTreeResult } from '@/app/components/chat-aside/files/use-lazy-file-tree';
import { useTheme } from '@/app/providers';

export interface FileExplorerProps extends UseLazyFileTreeResult {
  projectName?: string;
  className?: string;
  style?: CSSProperties;
  onNewFile?: () => void;
  onNewFolder?: () => void;
}

export function FileExplorer({
  model,
  projectName,
  className,
  style,
  onNewFile,
  onNewFolder,
}: FileExplorerProps) {
  const { resolvedTheme } = useTheme();
  const search = useFileTreeSearch(model);

  // Mirrors TreeApp's `toggleSearch`. Recreated whenever `search` changes,
  // which is fine — the hook's own identity is stable across renders, so
  // this ends up being one callback for the life of the tree.
  const toggleSearch = useCallback(() => {
    if (search.isOpen) {
      search.close();
      return;
    }
    search.open();
  }, [search]);

  const header = useMemo<ReactNode>(
    () =>
      projectName ? (
        <FileExplorerHeader
          projectName={projectName}
          isSearchOpen={search.isOpen}
          onToggleSearch={toggleSearch}
          onNewFile={onNewFile}
          onNewFolder={onNewFolder}
        />
      ) : null,
    [projectName, search.isOpen, toggleSearch, onNewFile, onNewFolder],
  );

  return (
    <div
      className={cn(
        // Hover scope for the header buttons.
        'group/file-explorer border-separator flex min-h-0 flex-col border-r',
        className,
      )}
      style={style}
    >
      <div className='min-h-0 flex-1'>
        <FileTree
          model={model}
          header={header}
          className='h-full'
          style={
            {
              height: '100%',
              colorScheme: resolvedTheme,
              fontFamily: 'var(--font-sans)',
              '--trees-padding-inline': '4px',
              '--trees-padding-inline-end': '4px',

              '--trees-row-height': '24px',

              '--trees-bg-override': 'transparent',
              '--trees-bg-muted-override': 'transparent',
              '--tree-app-editor-bg': 'transparent',

              '--trees-fg-override': 'var(--foreground)',
              '--trees-fg-muted-override': 'var(--muted)',

              '--trees-hover-bg-override': 'var(--surface-hover)',
              '--trees-selected-fg-override': 'var(--accent-soft-foreground)',
              '--trees-selected-bg-override': 'var(--accent-soft)',
              '--trees-selected-border-color-override':
                'color-mix(in oklab, var(--accent) 20%, transparent)',
              '--trees-selected-focused-border-color-override':
                'color-mix(in oklab, var(--accent) 20%, transparent)',

              '--trees-focus-ring-color-override':
                'color-mix(in oklab, var(--accent) 20%, transparent)',

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

interface FileExplorerHeaderProps {
  projectName: string;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  onNewFile?: () => void;
  onNewFolder?: () => void;
}

/**
 * Mirrors TreeApp's `DefaultProjectHeader`.
 *
 * The search button sits outside the hover-reveal group on purpose: while
 * search is closed it participates in the group (muted at rest, revealed on
 * hover), but while search is open it pins to `opacity-100` so the control
 * that closes it is always visible. That's the one behavior difference from
 * the new-file/new-folder buttons, which are hover-only.
 */
function FileExplorerHeader({
  projectName,
  isSearchOpen,
  onToggleSearch,
  onNewFile,
  onNewFolder,
}: FileExplorerHeaderProps) {
  return (
    <div className='flex h-8 items-center justify-between gap-2 px-2 pt-1 pb-2'>
      <div
        className='text-muted min-w-0 truncate text-xs font-medium'
        title={projectName}
      >
        {projectName}
      </div>

      <div className='flex items-center gap-2'>
        <button
          type='button'
          title={isSearchOpen ? 'Clear and close search' : 'Search files'}
          aria-label={isSearchOpen ? 'Close search' : 'Search files'}
          aria-pressed={isSearchOpen}
          // preventDefault on mousedown keeps focus on the search input so
          // its onBlur handler doesn't race our click and auto-close+reopen
          // the search. Without this, clicking the toggle while the input is
          // focused would blur -> closeSearch() -> click sees isOpen=false
          // -> reopen, which looks like the button doing nothing.
          onMouseDown={(event) => {
            if (isSearchOpen) {
              event.preventDefault();
            }
          }}
          onClick={onToggleSearch}
          className={cn(
            'flex h-4 w-4 cursor-pointer items-center justify-center',
            'transition-opacity duration-150',
            'focus-visible:opacity-100',
            // Open: pinned bright. Closed: muted, revealed on hover.
            isSearchOpen
              ? 'text-foreground opacity-100'
              : 'text-muted hover:text-foreground opacity-25 group-hover/file-explorer:opacity-100',
          )}
        >
          <IconSearch aria-hidden='true' className='h-[14px] w-[14px]' />
        </button>

        <div
          className={cn(
            'flex items-center gap-2 transition-opacity duration-150',
            // Hover-only reveal, always muted at rest. Same treatment as
            // TreeApp's new file/folder affordance.
            'opacity-25',
            'group-hover/file-explorer:opacity-100 focus-within:opacity-100',
          )}
        >
          <button
            type='button'
            title='New file'
            aria-label='New file'
            onClick={onNewFile}
            className='text-muted hover:text-foreground flex h-4 w-4 cursor-pointer items-center justify-center'
          >
            <IconFilePlus aria-hidden='true' />
          </button>
          <button
            type='button'
            title='New folder'
            aria-label='New folder'
            onClick={onNewFolder}
            className='text-muted hover:text-foreground flex h-4 w-4 cursor-pointer items-center justify-center'
          >
            <IconFolderPlus aria-hidden='true' />
          </button>
        </div>
      </div>
    </div>
  );
}
