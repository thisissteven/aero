'use client';

import { cn } from '@aero/ui';
import { IconFilePlus, IconFolderPlus, IconSearch } from '@pierre/icons';
import { FileTree, useFileTreeSearch } from '@pierre/trees/react';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

import type { UseLazyFileTreeResult } from '@/app/components/chat-aside/files/use-lazy-file-tree';
import { useTheme } from '@/app/providers';

export interface FileExplorerProps extends UseLazyFileTreeResult {
  projectName?: string;
  className?: string;
  style?: CSSProperties;
}

export function FileExplorer({
  model,
  projectName,
  className,
  style,
  createFile,
  createFolder,
  treeHostRef,
}: FileExplorerProps) {
  const { resolvedTheme } = useTheme();
  const search = useFileTreeSearch(model);

  // Wrapper around <FileTree> so the hook can find the custom element's
  // shadow root for the search-input listener. The hook holds its own ref;
  // we proxy the host element into it.
  const wrapperRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!wrapperRef.current) return;
    const host = wrapperRef.current.querySelector('file-tree');
    treeHostRef.current = host instanceof HTMLElement ? host : null;
    return () => {
      treeHostRef.current = null;
    };
  }, [treeHostRef]);

  const toggleSearch = useCallback(() => {
    if (search.isOpen) {
      search.close();
      return;
    }
    search.open();
  }, [search]);

  // ── Context menu (rename / delete) ─────────────────────────────────

  const [menu, setMenu] = useState<{
    x: number;
    y: number;
    path: string;
    isDir: boolean;
  } | null>(null);

  useEffect(() => {
    if (!menu) return;
    const close = () => setMenu(null);
    window.addEventListener('pointerdown', close);
    window.addEventListener('blur', close);
    return () => {
      window.removeEventListener('pointerdown', close);
      window.removeEventListener('blur', close);
    };
  }, [menu]);

  const onContextMenu = useCallback(
    (event: React.MouseEvent) => {
      const selected = model.getSelectedPaths();
      if (selected.length !== 1) return;
      const item = model.getItem(selected[0]);
      if (!item) return;
      event.preventDefault();
      setMenu({
        x: event.clientX,
        y: event.clientY,
        path: selected[0],
        isDir: item.isDirectory(),
      });
    },
    [model],
  );

  const onRename = useCallback(() => {
    if (!menu) return;
    model.startRenaming(menu.path);
    setMenu(null);
  }, [menu, model]);

  const onDelete = useCallback(() => {
    if (!menu) return;
    const { path, isDir } = menu;
    if (isDir && !window.confirm(`Delete ${path} and its contents?`)) {
      setMenu(null);
      return;
    }
    model.remove(path, isDir ? { recursive: true } : undefined);
    setMenu(null);
  }, [menu, model]);

  const header = useMemo<ReactNode>(
    () =>
      projectName ? (
        <FileExplorerHeader
          projectName={projectName}
          isSearchOpen={search.isOpen}
          onToggleSearch={toggleSearch}
          onNewFile={() => createFile('')}
          onNewFolder={() => createFolder('')}
        />
      ) : null,
    [projectName, search.isOpen, toggleSearch, createFile, createFolder],
  );

  return (
    <div
      className={cn(
        'group/file-explorer border-separator flex min-h-0 flex-col border-r',
        className,
      )}
      style={style}
    >
      <div
        ref={wrapperRef}
        className='min-h-0 flex-1'
        onContextMenu={onContextMenu}
      >
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

      {menu
        ? createPortal(
            <div
              // Stop the global pointerdown-to-close from firing before the
              // click reaches the menu buttons.
              onPointerDown={(e) => e.stopPropagation()}
              style={{ position: 'fixed', left: menu.x, top: menu.y }}
              className='border-separator bg-surface z-50 min-w-[160px] rounded-md border py-1 text-xs shadow-lg'
            >
              <ContextMenuButton onSelect={onRename}>Rename</ContextMenuButton>
              <ContextMenuButton onSelect={onDelete} danger>
                Delete
              </ContextMenuButton>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}

function ContextMenuButton({
  children,
  onSelect,
  danger,
}: {
  children: ReactNode;
  onSelect: () => void;
  danger?: boolean;
}) {
  return (
    <button
      type='button'
      onClick={onSelect}
      className={cn(
        'hover:bg-surface-hover block w-full px-3 py-1.5 text-left transition-colors',
        danger ? 'text-danger' : 'text-foreground',
      )}
    >
      {children}
    </button>
  );
}

// ── Header ─────────────────────────────────────────────────────────────

interface FileExplorerHeaderProps {
  projectName: string;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
}

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
        className='text-foreground min-w-0 truncate text-xs font-medium'
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
          onMouseDown={(event) => {
            if (isSearchOpen) event.preventDefault();
          }}
          onClick={onToggleSearch}
          className={cn(
            'flex h-4 w-4 cursor-pointer items-center justify-center',
            'transition-opacity duration-150',
            'focus-visible:opacity-100',
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
