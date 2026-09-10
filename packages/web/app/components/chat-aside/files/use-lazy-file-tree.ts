import type { FileTree as FileTreeModel } from '@pierre/trees';
import { useFileTree } from '@pierre/trees/react';
import { useCallback, useEffect, useRef, useState } from 'react';

import { FsSocket } from '@/app/components/chat-aside/files/fs-socket';

export interface UseLazyFileTreeOptions {
  /** Path on the machine running the Hono server, not the browser. */
  root: string;
  wsUrl?: string;
}

export interface UseLazyFileTreeResult {
  model: FileTreeModel;
  socket: FsSocket;
  error: string | null;
}

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
}: UseLazyFileTreeOptions): UseLazyFileTreeResult {
  const socketRef = useRef<FsSocket | null>(null);
  if (!socketRef.current) {
    socketRef.current = new FsSocket({ root, url: wsUrl });
  }
  const socket = socketRef.current;

  const [error, setError] = useState<string | null>(null);
  const loadedDirs = useRef(new Set<string>());

  const { model } = useFileTree({
    paths: [],
    search: true,
    fileTreeSearchMode: 'hide-non-matches',
    initialExpansion: 'closed',
    flattenEmptyDirectories: true,
    density: 'default',
    composition: {
      contextMenu: {
        enabled: true,
        buttonVisibility: 'when-needed',
      },
    },
    // gitStatus: [{
    //   path: '',
    //   status: 'added'
    // }]
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
