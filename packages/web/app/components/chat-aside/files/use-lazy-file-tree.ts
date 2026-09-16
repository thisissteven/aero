'use client';

import type { FileTree as FileTreeModel } from '@pierre/trees';
import { FILE_TREE_DENSITY_PRESETS } from '@pierre/trees';
import { useFileTree } from '@pierre/trees/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { FsSocket } from '@/app/components/chat-aside/files/fs-socket';

export interface UseLazyFileTreeOptions {
  root: string;
  wsUrl?: string;
  viewportHeight?: number;
  density?: keyof typeof FILE_TREE_DENSITY_PRESETS;
}

export interface GitStatusEntry {
  path: string;
  status:
    | 'added'
    | 'modified'
    | 'deleted'
    | 'renamed'
    | 'untracked'
    | 'ignored';
}

export interface UseLazyFileTreeResult {
  model: FileTreeModel;
  socket: FsSocket;
  error: string | null;
  gitStatus: readonly GitStatusEntry[];
  createFile: (parentDir: string) => void;
  createFolder: (parentDir: string) => void;
  refreshGitStatus: () => void;
  treeHostRef: React.MutableRefObject<HTMLElement | null>;
}

const DEFAULT_DENSITY = 'default' as const;
const DEFAULT_VIEWPORT_HEIGHT = 600;

const COMPOSITION = {
  contextMenu: {
    enabled: false, // we render our own
  },
} as const;

const LAZY_TREE_UNSAFE_CSS = `
:host {
  --trees-bg-override: transparent;
  --trees-bg-muted-override: transparent;
}

[data-file-tree-search-container][data-open='false'] {
  display: none;
}
`;

function normalizePath(path: string, isDirectory: boolean): string {
  const clean = path.replace(/\/$/, '');
  return isDirectory ? `${clean}/` : clean;
}

// Mirrors TreeApp's helper: walks an integer suffix until the name is free.
function getUniquePath(model: FileTreeModel, basePath: string): string {
  const hasCollision = (candidate: string): boolean => {
    if (model.getItem(candidate) != null) return true;
    const alternate = candidate.endsWith('/')
      ? candidate.slice(0, -1)
      : `${candidate}/`;
    return model.getItem(alternate) != null;
  };

  let suffix = 0;
  let candidate = basePath;
  while (hasCollision(candidate)) {
    suffix += 1;
    if (basePath.endsWith('/')) {
      candidate = `${basePath.slice(0, -1)}-${String(suffix)}/`;
      continue;
    }
    const dotIndex = basePath.lastIndexOf('.');
    const slashIndex = basePath.lastIndexOf('/');
    if (dotIndex > slashIndex) {
      candidate = `${basePath.slice(0, dotIndex)}-${String(suffix)}${basePath.slice(dotIndex)}`;
      continue;
    }
    candidate = `${basePath}-${String(suffix)}`;
  }
  return candidate;
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
  const [gitStatus, setGitStatus] = useState<readonly GitStatusEntry[]>([]);
  const loadedDirs = useRef(new Set<string>());

  const viewportRowCount = useMemo(
    () =>
      Math.max(
        1,
        Math.round(
          viewportHeight / FILE_TREE_DENSITY_PRESETS[density].itemHeight,
        ),
      ),
    [viewportHeight, density],
  );

  const treeOptions = useMemo(
    () => ({
      paths: [] as string[],
      search: true as const,
      fileTreeSearchMode: 'hide-non-matches' as const,
      initialExpansion: 'closed' as const,
      flattenEmptyDirectories: true,
      density,
      renaming: true as const,
      dragAndDrop: true as const,
      composition: COMPOSITION,
      initialVisibleRowCount: viewportRowCount,
      unsafeCSS: LAZY_TREE_UNSAFE_CSS,
    }),
    [density, viewportRowCount],
  );

  const { model } = useFileTree(treeOptions);

  // ── Git status ─────────────────────────────────────────────────────

  const refreshGitStatus = useCallback(() => {
    socket
      .gitStatus()
      .then((result) => {
        setGitStatus(result.entries);
        model.setGitStatus(result.entries);
      })
      .catch(() => {
        /* not a git repo or transient error */
      });
  }, [model, socket]);

  // Debounced refresh for post-mutation calls, so two rapid writes only
  // trigger one `git status` invocation.
  const gitRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const scheduleGitRefresh = useCallback(() => {
    if (gitRefreshTimer.current) clearTimeout(gitRefreshTimer.current);
    gitRefreshTimer.current = setTimeout(() => {
      gitRefreshTimer.current = null;
      refreshGitStatus();
    }, 400);
  }, [refreshGitStatus]);

  useEffect(() => {
    refreshGitStatus();
  }, [refreshGitStatus]);

  useEffect(() => {
    return () => {
      if (gitRefreshTimer.current) clearTimeout(gitRefreshTimer.current);
    };
  }, []);

  // ── Lazy directory loading ─────────────────────────────────────────

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

  // ── Mutation → FS bridge ───────────────────────────────────────────
  //
  // The tree model treats `add` / `move` / `remove` as local edits. We mirror
  // them onto the filesystem here.
  //
  // `pendingCreates` tracks paths that were added via `model.add()` but not
  // yet persisted. Two cases:
  //
  //   - `add`            → mark the path pending.
  //   - `move` from pending → the tree just committed an inline rename of a
  //                      placeholder. The source never existed on disk, so
  //                      this is really a "create as" — call writeFile /
  //                      mkdir with the destination and update the marker.
  //   - `move` from real → a true rename; call socket.rename.
  //   - `remove` pending → user canceled a create; nothing to delete on disk.
  //   - `remove` real    → call socket.deletePath.

  useEffect(() => {
    const pendingCreates = new Set<string>();

    const unsubscribe = model.onMutation('*', async (event) => {
      const events = event.operation === 'batch' ? event.events : [event];

      for (const e of events) {
        try {
          if (e.operation === 'add') {
            pendingCreates.add(e.path);
          } else if (e.operation === 'move') {
            const wasPending = pendingCreates.has(e.from);
            if (wasPending) pendingCreates.delete(e.from);

            const isDir = e.to.endsWith('/');

            if (wasPending) {
              if (isDir) {
                await socket.mkdir(e.to.replace(/\/$/, ''));
              } else {
                await socket.writeFile(e.to, '');
              }
              pendingCreates.add(e.to);
            } else {
              await socket.rename(
                e.from.replace(/\/$/, ''),
                e.to.replace(/\/$/, ''),
              );
            }
            scheduleGitRefresh();
          } else if (e.operation === 'remove') {
            if (pendingCreates.has(e.path)) {
              pendingCreates.delete(e.path);
              continue;
            }
            await socket.deletePath(
              e.path.replace(/\/$/, ''),
              e.path.endsWith('/'),
            );
            scheduleGitRefresh();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : 'Filesystem error');
        }
      }
    });

    return unsubscribe;
  }, [model, socket, scheduleGitRefresh]);

  // ── Server-backed search ───────────────────────────────────────────
  //
  // The tree's built-in search filters visible rows against what's already
  // loaded. That misses files in directories that haven't been lazily opened
  // yet. We listen to the input directly and merge WS search matches into the
  // model, so the built-in filter sees them.
  //
  // The listener attaches to the shadow DOM's input element. Since FileTree
  // may not forward refs, we query it off a wrapper the caller provides via
  // `treeHostRef`.

  const treeHostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    const host = treeHostRef.current;
    if (!host) return;

    let cancelled = false;
    let cleanup: (() => void) | null = null;

    const tryAttach = () => {
      if (cancelled) return;
      const input = host.shadowRoot?.querySelector<HTMLInputElement>(
        '[data-file-tree-search-input]',
      );
      if (!input) {
        // The tree's shadow DOM renders synchronously with the custom element,
        // but the search input only exists when `search: true`. Retry a few
        // frames in case of hydration lag.
        requestAnimationFrame(tryAttach);
        return;
      }

      const searchAdded = new Set<string>();
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let querySeq = 0;

      const runSearch = async () => {
        if (cancelled) return;
        const q = input.value.trim();
        const seq = ++querySeq;

        // Drop the previous query's added paths before adding the next batch.
        if (searchAdded.size > 0) {
          model.batch(
            Array.from(searchAdded).map((p) => ({
              type: 'remove' as const,
              path: p,
            })),
          );
          searchAdded.clear();
        }

        if (q.length === 0) return;

        try {
          const matches: string[] = [];
          await socket.search(q, (batch) => {
            matches.push(...batch);
          });
          if (cancelled || seq !== querySeq) return;

          const newPaths = matches
            .map((p) => normalizePath(p, false))
            .filter((p) => model.getItem(p) == null);
          if (newPaths.length === 0) return;

          model.batch(newPaths.map((p) => ({ type: 'add' as const, path: p })));
          for (const p of newPaths) searchAdded.add(p);
        } catch {
          /* ignore — search is best-effort */
        }
      };

      const onInput = () => {
        if (debounceTimer) clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => void runSearch(), 180);
      };

      input.addEventListener('input', onInput);

      cleanup = () => {
        input.removeEventListener('input', onInput);
        if (debounceTimer) clearTimeout(debounceTimer);
        // Search-added paths stay in the model: they're valid filesystem
        // paths, and removing them would invalidate any directories the
        // expansion watcher already auto-loaded.
      };
    };

    tryAttach();

    return () => {
      cancelled = true;
      cleanup?.();
    };
  }, [model, socket]);

  // ── Cleanup ────────────────────────────────────────────────────────

  useEffect(() => () => socket.close(), [socket]);

  // ── Mutators exposed to the panel ──────────────────────────────────

  const createFile = useCallback(
    (parentDir: string) => {
      const template = 'untitled';
      const target = getUniquePath(model, `${parentDir}${template}`);
      model.add(target);
      model.startRenaming(target, { removeIfCanceled: true });
    },
    [model],
  );

  const createFolder = useCallback(
    (parentDir: string) => {
      const template = 'untitled/';
      const target = getUniquePath(model, `${parentDir}${template}`);
      model.add(target);
      model.startRenaming(target, { removeIfCanceled: true });
    },
    [model],
  );

  return {
    model,
    socket,
    error,
    gitStatus,
    createFile,
    createFolder,
    refreshGitStatus,
    // Wire this to the FileTree element's host via a ref.
    treeHostRef: treeHostRef as React.MutableRefObject<HTMLElement | null>,
  } as UseLazyFileTreeResult & {
    treeHostRef: React.MutableRefObject<HTMLElement | null>;
  };
}
