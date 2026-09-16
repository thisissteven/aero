'use client';

import type { FileTree as FileTreeModel } from '@pierre/trees';
import { FILE_TREE_DENSITY_PRESETS } from '@pierre/trees';
import { useFileTree } from '@pierre/trees/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { FsSocket } from '@/app/components/chat-aside/files/fs-socket';

export interface UseLazyFileTreeOptions {
  /** Path on the machine running the Hono server, not the browser. */
  root: string;
  wsUrl?: string;
  /**
   * Row height hint for the tree's virtualizer. The tree renders only the
   * visible slice plus an overscan; the rest is scrolled. Any value works —
   * the tree re-measures — but a close estimate avoids a first-paint jump
   * for large directories. Defaults to 600px of content.
   */
  viewportHeight?: number;
  density?: keyof typeof FILE_TREE_DENSITY_PRESETS;
}

export interface UseLazyFileTreeResult {
  model: FileTreeModel;
  socket: FsSocket;
  error: string | null;
}

const DEFAULT_DENSITY = 'default' as const;
const DEFAULT_VIEWPORT_HEIGHT = 600;

function normalizePath(path: string, isDirectory: boolean): string {
  const clean = path.replace(/\/$/, '');
  return isDirectory ? `${clean}/` : clean;
}

function useDirectoryExpansionWatcher(
  model: FileTreeModel,
  onExpand: (path: string) => void,
): void {
  const knownExpanded = useRef(new Set<string>());
  const onExpandRef = useRef(onExpand);
  onExpandRef.current = onExpand;

  useEffect(() => {
    const checkForNewlyExpanded = () => {
      const count = model.getVisibleCount();
      if (count === 0) return;
      const rows = model.getVisibleRows(0, count - 1);
      for (const row of rows) {
        const item = model.getItem(row.path);
        if (
          item &&
          item.isDirectory() &&
          !knownExpanded.current.has(row.path)
        ) {
          knownExpanded.current.add(row.path);
          onExpandRef.current(row.path);
        }
      }
    };

    checkForNewlyExpanded();
    const unsubscribe = model.subscribe(checkForNewlyExpanded);
    return unsubscribe;
  }, [model]);
}

export function useLazyFileTree({
  root,
  wsUrl,
  viewportHeight = DEFAULT_VIEWPORT_HEIGHT,
  density = DEFAULT_DENSITY,
}: UseLazyFileTreeOptions): UseLazyFileTreeResult {
  const socketRef = useRef<FsSocket | null>(null);
  if (!socketRef.current) {
    socketRef.current = new FsSocket({ root, url: wsUrl });
  }
  const socket = socketRef.current;

  const [error, setError] = useState<string | null>(null);
  const loadedDirs = useRef(new Set<string>());

  // The tree options mirror the Pierre demo's TreeApp. Every one of these is
  // load-bearing for a specific behavior:
  //
  //   search: true              — required for `useFileTreeSearch` to work
  //                               and for the built-in search input to render
  //   fileTreeSearchMode        — controls how non-matching rows are treated
  //                               while the search input is up
  //   renaming: true            — required for `model.startRenaming`, which
  //                               the new-file / new-folder buttons call
  //   dragAndDrop: true         — file/folder moves
  //   composition.contextMenu   — the row context menu (rename, delete, …)
  //   flattenEmptyDirectories   — collapses `a/b/c` chains where each level
  //                               has only one child, matching the demo
  //   initialExpansion          — start collapsed; the expansion watcher
  //                               lazily pulls children from the socket
  //   initialVisibleRowCount    — virtualizer row budget; the tree only
  //                               paints this many rows + overscan
  const viewportRowCount = Math.max(
    1,
    Math.round(viewportHeight / FILE_TREE_DENSITY_PRESETS[density].itemHeight),
  );

  const { model } = useFileTree({
    paths: [],
    search: true,
    fileTreeSearchMode: 'hide-non-matches',
    initialExpansion: 'closed',
    flattenEmptyDirectories: true,
    density,
    renaming: true,
    dragAndDrop: true,
    composition: {
      contextMenu: {
        enabled: true,
        triggerMode: 'right-click',
      },
    },
    initialVisibleRowCount: viewportRowCount,
    // The tree's own background tokens are suppressed so the explorer panel's
    // `bg-surface` shows through, same as the demo's TREE_APP_DEMO_UNSAFE_CSS
    // combined with the container styling in FileExplorer.
    unsafeCSS: `
      :host {
        --trees-bg-override: transparent;
        --trees-bg-muted-override: transparent;
      }
    `,
  });

  const loadDirectory = useCallback(
    async (dirPath: string) => {
      const cleanPath = dirPath.replace(/\/$/, '');
      if (loadedDirs.current.has(cleanPath)) return;

      loadedDirs.current.add(cleanPath);

      try {
        const result = await socket.list(cleanPath);
        if (result.entries.length > 0) {
          model.batch(
            result.entries.map((e) => ({
              type: 'add' as const,
              path: normalizePath(e.path, e.kind === 'dir'),
            })),
          );
        }
      } catch (err) {
        loadedDirs.current.delete(cleanPath);
        setError(
          err instanceof Error
            ? err.message
            : `Failed to load ${cleanPath || '/'}`,
        );
      }
    },
    [model, socket],
  );

  useEffect(() => {
    let cancelled = false;
    loadedDirs.current.add('');
    socket
      .list('')
      .then((result) => {
        if (cancelled) return;
        model.resetPaths(
          result.entries.map((e) => normalizePath(e.path, e.kind === 'dir')),
        );
      })
      .catch((err) => {
        if (!cancelled)
          setError(err instanceof Error ? err.message : 'Failed to list root');
      });
    return () => {
      cancelled = true;
    };
  }, [model, socket]);

  useDirectoryExpansionWatcher(model, loadDirectory);

  useEffect(() => () => socket.close(), [socket]);

  return { model, socket, error };
}
