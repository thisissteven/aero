'use client';

import { cn, Dropdown, Label, Skeleton, toast } from '@aero/ui';
import { IconFilePlus, IconFolderPlus, IconSearch } from '@pierre/icons';
import type { ContextMenuOpenContext } from '@pierre/trees';
import { FileTree, useFileTreeSearch } from '@pierre/trees/react';
import type { CSSProperties, ReactNode } from 'react';
import { useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { DeletePathConfirmationModal } from '@/app/components/chat-aside/files/delete-path-confirmation-modal';
import { RefreshButton } from '@/app/components/chat-aside/files/refresh-button';
import type { UseLazyFileTreeResult } from '@/app/components/chat-aside/files/use-lazy-file-tree';
import { CopyPath } from '@/app/components/chat-navbar/open-in-actions/copy-path';
import { useGlobalModalStore, useTheme } from '@/app/providers';

export interface FileExplorerProps extends UseLazyFileTreeResult {
  projectName?: string;
  className?: string;
  style?: CSSProperties;
  root: string;
}

function getParentPath(filePath: string): string {
  const normalized = filePath.endsWith('/') ? filePath.slice(0, -1) : filePath;
  const slash = normalized.lastIndexOf('/');
  return slash < 0 ? '' : normalized.slice(0, slash + 1);
}

export function FileExplorer({
  model,
  projectName,
  className,
  style,
  createFile,
  createFolder,
  deletePath,
  refresh,
  isTreeLoading,
  treeHostRef,
  root,
}: FileExplorerProps) {
  const { resolvedTheme } = useTheme();
  const search = useFileTreeSearch(model);

  const wrapperRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;

    const candidates = wrapper.querySelectorAll<HTMLElement>('*');
    let host: HTMLElement | null = null;
    for (const el of candidates) {
      if (el.shadowRoot) {
        host = el;
        break;
      }
    }

    treeHostRef.current = host;
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

  const renderContextMenu = useCallback(
    (
      item: { path: string; kind: 'file' | 'directory' },
      context: ContextMenuOpenContext,
    ): ReactNode => {
      const isDir = item.kind === 'directory';
      const baseDirectoryPath = isDir ? item.path : getParentPath(item.path);

      const handleAction = (key: React.Key) => {
        context.close({ restoreFocus: false });

        window.setTimeout(() => {
          if (key === 'new-file') {
            createFile(baseDirectoryPath);
          } else if (key === 'new-folder') {
            createFolder(baseDirectoryPath);
          } else if (key === 'rename') {
            model.startRenaming(item.path);
          } else if (key === 'delete') {
            if (isDir) {
              useGlobalModalStore.getState().openModal({
                children: (
                  <DeletePathConfirmationModal
                    path={item.path}
                    isDir={isDir}
                    onConfirm={() => deletePath(item.path, isDir)}
                  />
                ),
              });
              return;
            }

            deletePath(item.path, isDir);
          }
        }, 0);
      };

      const menu = (
        <Dropdown
          isOpen
          onOpenChange={(open) => {
            if (!open) context.close({ restoreFocus: false });
          }}
          size='sm'
        >
          <Dropdown.Trigger
            aria-hidden='true'
            style={{
              position: 'fixed',
              top: context.anchorRect.bottom,
              left: context.anchorRect.left,
              width: 1,
              height: 1,
              opacity: 0,
              pointerEvents: 'none',
              border: 0,
              padding: 0,
            }}
          />
          <Dropdown.Popover
            placement='bottom start'
            offset={0}
            className='w-44 max-sm:min-w-44'
          >
            <div data-file-tree-context-menu-root='true'>
              <Dropdown.Menu aria-label={`${item.path} actions`}>
                <Dropdown.Item
                  id='new-file'
                  textValue='New file'
                  onClick={() => handleAction('new-file')}
                >
                  <Label>New file</Label>
                </Dropdown.Item>
                <Dropdown.Item
                  id='new-folder'
                  textValue='New folder'
                  onClick={() => handleAction('new-folder')}
                >
                  <Label>New folder</Label>
                </Dropdown.Item>
                <Dropdown.Item
                  id='rename'
                  textValue='Rename'
                  onClick={() => handleAction('rename')}
                >
                  <Label>Rename</Label>
                </Dropdown.Item>
                <CopyPath path={root + '/' + item.path} withIcon={false} />
                <Dropdown.Item
                  id='delete'
                  textValue='Delete'
                  variant='danger'
                  onClick={() => handleAction('delete')}
                >
                  <Label>Delete</Label>
                </Dropdown.Item>
              </Dropdown.Menu>
            </div>
          </Dropdown.Popover>
        </Dropdown>
      );

      return typeof document !== 'undefined'
        ? createPortal(menu, document.body)
        : menu;
    },
    [model, createFile, createFolder, deletePath],
  );

  return (
    <div
      className={cn(
        'group/file-explorer border-separator flex min-h-0 flex-col border-r',
        className,
      )}
      style={style}
    >
      {projectName ? (
        <FileExplorerHeader
          projectName={projectName}
          isSearchOpen={search.isOpen}
          onToggleSearch={toggleSearch}
          onNewFile={() => createFile('')}
          onNewFolder={() => createFolder('')}
          onRefresh={refresh}
        />
      ) : null}

      <div ref={wrapperRef} className='relative min-h-0 flex-1'>
        <FileTree
          model={model}
          renderContextMenu={renderContextMenu}
          className='h-full pb-1'
          style={
            {
              height: '100%',
              colorScheme: resolvedTheme,
              fontFamily: 'var(--font-sans)',
              '--trees-padding-inline': '4px',
              '--trees-padding-inline-end': '4px',

              '--trees-row-height': '24px',

              '--trees-bg-override': 'transparent',
              '--trees-bg-muted-override':
                'color-mix(in oklab, var(--accent) 10%, transparent)',
              '--tree-app-editor-bg': 'transparent',

              '--trees-fg-override': 'var(--foreground)',
              '--trees-fg-muted-override': 'var(--muted)',

              '--trees-hover-bg-override': 'var(--surface-hover)',
              '--trees-selected-fg-override': 'var(--accent-soft-foreground)',
              '--trees-selected-bg-override': 'var(--accent-soft)',
              '--trees-selected-border-color-override':
                'color-mix(in oklab, var(--accent) 0%, transparent)',
              '--trees-selected-focused-border-color-override':
                'color-mix(in oklab, var(--accent) 0%, transparent)',

              '--trees-focus-ring-color-override':
                'color-mix(in oklab, var(--accent) 0%, transparent)',

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

        {/*
          Skeleton overlay sits on top of the tree's empty state while the
          root directory listing is in flight. The tree stays mounted underneath
          so treeHostRef keeps pointing at a live shadow root for the search
          listener — conditionally unmounting the tree would break that effect.
        */}
        {isTreeLoading ? (
          <div className='absolute inset-0'>
            <FileExplorerSkeleton />
          </div>
        ) : null}
      </div>
    </div>
  );
}

// ── Skeleton ────────────────────────────────────────────────────────────

function FileExplorerSkeleton() {
  // Varying widths make the placeholder read as a list of files/folders
  // rather than a uniform grid. Heights match `--trees-row-height` (24px)
  // so the swap from skeleton to real rows doesn't jump.
  const widths = [
    'w-2/5',
    'w-3/5',
    'w-1/2',
    'w-4/5',
    'w-2/3',
    'w-1/2',
    'w-3/4',
    'w-2/5',
    'w-3/5',
    'w-1/2',
    'w-4/5',
    'w-2/3',
    'w-1/2',
    'w-3/4',
    'w-2/5',
    'w-3/5',
    'w-1/2',
    'w-4/5',
    'w-2/3',
    'w-1/2',
    'w-3/4',
  ];

  return (
    <div
      className='flex flex-col gap-1.5 px-3 pt-1 overflow-y-hidden max-h-full'
      aria-hidden='true'
    >
      {widths.map((width, index) => (
        <Skeleton
          key={index}
          className={cn('h-6 shrink-0 rounded-md', width)}
          style={{ animationDelay: `${index * 80}ms` }}
        />
      ))}
    </div>
  );
}

// ── Header ─────────────────────────────────────────────────────────────

interface FileExplorerHeaderProps {
  projectName: string;
  isSearchOpen: boolean;
  onToggleSearch: () => void;
  onNewFile: () => void;
  onNewFolder: () => void;
  onRefresh: () => void;
}

function FileExplorerHeader({
  projectName,
  isSearchOpen,
  onToggleSearch,
  onNewFile,
  onNewFolder,
  onRefresh,
}: FileExplorerHeaderProps) {
  return (
    <div className='flex h-8 shrink-0 items-center justify-between gap-2 px-2 pt-1 pb-2'>
      <div
        className='text-foreground ml-1 min-w-0 truncate text-xs font-medium'
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
          <IconSearch aria-hidden='true' className='mt-0.25 size-3' />
        </button>

        <div
          className={cn(
            'flex items-center gap-2 transition-opacity duration-150',
            'opacity-25',
            'group-hover/file-explorer:opacity-100 focus-within:opacity-100',
          )}
        >
          <RefreshButton
            classNameOverride='relative text-muted hover:text-foreground flex h-4 w-4 cursor-pointer items-center justify-center'
            label='Refresh'
            onClick={onRefresh}
          />
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
