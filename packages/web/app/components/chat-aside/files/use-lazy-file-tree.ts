'use client';

import type { FileTree as FileTreeModel } from '@pierre/trees';
import { FILE_TREE_DENSITY_PRESETS } from '@pierre/trees';
import { useFileTree } from '@pierre/trees/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFileViewerStore } from '@/app/components/chat-aside/files/file-viewer-store';
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
  isTreeLoading: boolean;
  createFile: (parentDir: string) => void;
  createFolder: (parentDir: string) => void;
  /** User-initiated delete. Only this API is allowed to remove files on disk. */
  deletePath: (path: string, isDir: boolean) => void;
  refreshGitStatus: () => void;
  refresh: () => void;
  treeHostRef: React.RefObject<HTMLElement | null>;
}

const DEFAULT_DENSITY = 'default' as const;
const DEFAULT_VIEWPORT_HEIGHT = 600;

const COMPOSITION = {
  contextMenu: {
    enabled: true,
    triggerMode: 'right-click',
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

[data-file-tree-context-menu-trigger] {
  color: var(--muted);
  opacity: 0.5;
  transition: opacity 120ms ease;
}

[data-file-tree-context-menu-trigger]:hover {
  opacity: 0.85;
}
`;

function normalizePath(path: string, isDirectory: boolean): string {
  const clean = path.replace(/\/$/, '');
  return isDirectory ? `${clean}/` : clean;
}

function cleanPath(p: string): string {
  return p.replace(/\/$/, '');
}

function ancestorPaths(filePath: string): string[] {
  const parts = filePath.split('/');
  const out: string[] = [];
  for (let i = 1; i < parts.length; i += 1) {
    out.push(`${parts.slice(0, i).join('/')}/`);
  }
  return out;
}

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

/**
 * Drops any move whose source is a descendant of another move's source.
 * Dragging a folder fires one move per descendant; only the topmost rename
 * needs to reach the server.
 *
 * Uses trailing-slash-stripped paths for comparison so `/foo/` correctly
 * subsumes `/foo/a` — comparing raw strings would miss it because
 * `/foo/a`.startsWith('/foo//') is false.
 */
function coalesceMoves(
  moves: readonly { from: string; to: string }[],
): { from: string; to: string }[] {
  const sorted = [...moves].sort((a, b) => a.from.length - b.from.length);
  const kept: { from: string; to: string }[] = [];
  for (const move of sorted) {
    const fromClean = cleanPath(move.from);
    if (kept.some((k) => fromClean.startsWith(`${cleanPath(k.from)}/`))) {
      continue;
    }
    kept.push(move);
  }
  return kept;
}

function coalesceRemoves(removes: readonly string[]): string[] {
  const sorted = [...removes].sort((a, b) => a.length - b.length);
  const kept: string[] = [];
  for (const r of sorted) {
    const rClean = cleanPath(r);
    if (kept.some((k) => rClean.startsWith(`${cleanPath(k)}/`))) continue;
    kept.push(r);
  }
  return kept;
}

function useDirectoryExpansionWatcher(
  model: FileTreeModel,
  onExpand: (path: string) => void,
): void {
  const knownExpanded = useRef(new Set<string>());
  const onExpandRef = useRef(onExpand);
  onExpandRef.current = onExpand;

  useEffect(() => {
    let lastCount = -1;

    const checkForNewlyExpanded = () => {
      const count = model.getVisibleCount();
      if (count === 0) {
        lastCount = 0;
        return;
      }
      if (count === lastCount) return;
      lastCount = count;

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

function useSelectionWatcher(model: FileTreeModel): void {
  const openFile = useFileViewerStore((s) => s.openFile);
  const openFileRef = useRef(openFile);
  openFileRef.current = openFile;

  const lastSelected = useRef<string | null>(null);

  useEffect(() => {
    const check = () => {
      const paths = model.getSelectedPaths?.() ?? [];
      const first = paths[0] ?? null;
      if (first === lastSelected.current) return;
      lastSelected.current = first;
      if (!first) return;

      // Directories end with '/'; skip them.
      if (first.endsWith('/')) return;
      const item = model.getItem(first);
      if (item?.isDirectory()) return;

      openFileRef.current(first.replace(/\/$/, ''));
    };

    check();
    return model.subscribe(check);
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

  const lastErrorRef = useRef<string | null>(null);
  const reportError = useCallback((err: unknown) => {
    const message = err instanceof Error ? err.message : 'Filesystem error';
    if (lastErrorRef.current === message) return;
    lastErrorRef.current = message;
    setError(message);
  }, []);
  const clearError = useCallback(() => {
    lastErrorRef.current = null;
    setError(null);
  }, []);

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
      flattenEmptyDirectories: false,
      density,
      renaming: true as const,
      // dragAndDrop: true as const,
      composition: COMPOSITION,
      initialVisibleRowCount: viewportRowCount,
      unsafeCSS: LAZY_TREE_UNSAFE_CSS,
    }),
    [density, viewportRowCount],
  );

  const { model } = useFileTree(treeOptions);

  // ── Git status ─────────────────────────────────────────────────────

  const gitInFlightRef = useRef(false);

  const refreshGitStatus = useCallback(() => {
    if (gitInFlightRef.current) return;
    gitInFlightRef.current = true;

    socket
      .gitStatus()
      .then((result) => {
        setGitStatus(result.entries);
        model.setGitStatus(result.entries);
      })
      .catch(() => {
        /* not a git repo */
      })
      .finally(() => {
        gitInFlightRef.current = false;
      });
  }, [model, socket]);

  const refresh = useCallback(() => {
    loadedDirs.current.clear();
    loadedDirs.current.add('');
    socket
      .list('')
      .then((result) => {
        model.resetPaths(
          result.entries.map((e) => normalizePath(e.path, e.kind === 'dir')),
        );
      })
      .catch((err) => {
        reportError(
          err instanceof Error ? err : new Error('Failed to refresh'),
        );
      });
    refreshGitStatus();
  }, [model, socket, reportError, refreshGitStatus]);

  const gitRefreshTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastMutationAtRef = useRef(0);

  const scheduleGitRefresh = useCallback(() => {
    lastMutationAtRef.current = Date.now();
    if (gitRefreshTimer.current) clearTimeout(gitRefreshTimer.current);
    gitRefreshTimer.current = setTimeout(() => {
      gitRefreshTimer.current = null;
      if (Date.now() - lastMutationAtRef.current < 500) {
        scheduleGitRefresh();
        return;
      }
      refreshGitStatus();
    }, 1500);
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
    (dirPath: string) => {
      const cleanDir = cleanPath(dirPath);
      if (loadedDirs.current.has(cleanDir)) return;
      loadedDirs.current.add(cleanDir);

      socket
        .list(cleanDir)
        .then((result) => {
          if (result.entries.length === 0) return;
          model.batch(
            result.entries.map((e) => ({
              type: 'add' as const,
              path: normalizePath(e.path, e.kind === 'dir'),
            })),
          );
        })
        .catch((err) => {
          loadedDirs.current.delete(cleanDir);
          reportError(
            err instanceof Error
              ? err
              : new Error(`Failed to load ${cleanDir || '/'}`),
          );
        });
    },
    [model, socket, reportError],
  );

  const [isTreeLoading, setIsTreeLoading] = useState(true);

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
        setIsTreeLoading(false);
      })
      .catch((err) => {
        if (cancelled) return;
        reportError(
          err instanceof Error ? err : new Error('Failed to list root'),
        );
        setIsTreeLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [model, socket, reportError]);

  useDirectoryExpansionWatcher(model, loadDirectory);
  useSelectionWatcher(model);

  // ── Mutation → FS bridge ───────────────────────────────────────────
  //
  // ⚠️  Synchronous handler, always. `model.onMutation` runs inline in the
  // tree's commit path; an async handler freezes the tree during DnD.
  //
  // ⚠️  Only user-initiated operations reach the server.
  //
  //   - `add` events are user creates only if the path is in
  //     `userCreatePaths`, which `createFile` / `createFolder` populate.
  //     Everything else is a lazy-load or search result.
  //
  //   - `remove` events are user deletes only if the path is in
  //     `userDeletePaths`, which `deletePath` populates. The tree ALSO
  //     fires internal `remove` events (search cleanup, flatten reflow,
  //     rename-mode setup). Those paths are not in `userDeletePaths`, so
  //     they're ignored — this is what was causing real files to be
  //     deleted on disk and, via the flood of `deletePath` round-trips,
  //     the freeze.
  //
  //   - `move` events from pending paths are creates-in-disguise (inline
  //     rename of a placeholder). Everything else is a real rename and is
  //     passed through; renames don't destroy data, so the guard is looser.

  const userCreatePaths = useRef(new Set<string>());
  const userDeletePaths = useRef(new Set<string>());

  useEffect(() => {
    const pendingCreates = new Set<string>();
    const queue: Array<
      | { kind: 'add'; path: string }
      | { kind: 'move'; from: string; to: string }
      | { kind: 'remove'; path: string }
    > = [];
    let drainScheduled = false;
    let tail: Promise<unknown> = Promise.resolve();

    const enqueue = (fn: () => Promise<unknown>) => {
      tail = tail.then(fn).catch(reportError);
    };

    const drain = () => {
      drainScheduled = false;
      if (queue.length === 0) return;

      const events = queue.splice(0, queue.length);

      const moves: { from: string; to: string }[] = [];
      const removes: string[] = [];

      for (const e of events) {
        if (e.kind === 'add') {
          if (userCreatePaths.current.has(e.path)) {
            userCreatePaths.current.delete(e.path);
            pendingCreates.add(e.path);
          }
          continue;
        }

        if (e.kind === 'move') {
          const wasPending = pendingCreates.has(e.from);
          if (wasPending) pendingCreates.delete(e.from);

          if (wasPending) {
            const cleanTo = cleanPath(e.to);
            const isDir = e.to.endsWith('/');
            enqueue(() =>
              isDir ? socket.mkdir(cleanTo) : socket.writeFile(cleanTo, ''),
            );
            pendingCreates.add(e.to);
          } else {
            moves.push(e);
          }
          continue;
        }

        if (e.kind === 'remove') {
          if (pendingCreates.has(e.path)) {
            pendingCreates.delete(e.path);
            continue;
          }
          if (!userDeletePaths.current.has(e.path)) {
            // Not a user delete — the model internally removed this path
            // (search cleanup, flatten reflow, rename-mode reset). Do not
            // touch disk.
            continue;
          }
          userDeletePaths.current.delete(e.path);
          removes.push(e.path);
        }
      }

      if (moves.length > 0) {
        for (const m of coalesceMoves(moves)) {
          const cleanFrom = cleanPath(m.from);
          const cleanTo = cleanPath(m.to);
          enqueue(() => socket.rename(cleanFrom, cleanTo));
        }
      }

      if (removes.length > 0) {
        for (const p of coalesceRemoves(removes)) {
          enqueue(() => socket.deletePath(cleanPath(p), p.endsWith('/')));
        }
      }

      if (moves.length > 0 || removes.length > 0) {
        scheduleGitRefresh();
      }
    };

    const unsubscribe = model.onMutation('*', (event) => {
      const events = event.operation === 'batch' ? event.events : [event];
      for (const e of events) {
        if (e.operation === 'add') {
          queue.push({ kind: 'add', path: e.path });
        } else if (e.operation === 'move') {
          queue.push({ kind: 'move', from: e.from, to: e.to });
        } else if (e.operation === 'remove') {
          queue.push({ kind: 'remove', path: e.path });
        }
      }

      if (!drainScheduled) {
        drainScheduled = true;
        queueMicrotask(drain);
      }
    });

    return () => {
      unsubscribe();
      void tail;
    };
  }, [model, socket, scheduleGitRefresh, reportError]);

  // ── Server-backed search ───────────────────────────────────────────

  const treeHostRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    let cleanup: (() => void) | null = null;
    let attachRaf = 0;

    const tryAttach = () => {
      if (cancelled) return;

      const host = treeHostRef.current;
      if (!host) {
        attachRaf = requestAnimationFrame(tryAttach);
        return;
      }

      const input = host.shadowRoot?.querySelector<HTMLInputElement>(
        '[data-file-tree-search-input]',
      );
      if (!input) {
        attachRaf = requestAnimationFrame(tryAttach);
        return;
      }

      const searchAdded = new Set<string>();
      let debounceTimer: ReturnType<typeof setTimeout> | null = null;
      let querySeq = 0;

      const runSearch = async () => {
        if (cancelled) return;
        const q = input.value.trim();
        const seq = ++querySeq;

        // Clear the previous query's additions. Skip any path whose parent
        // directory has since been lazily loaded — those rows belong to the
        // tree now and shouldn't be touched.
        if (searchAdded.size > 0) {
          const removable: string[] = [];
          for (const p of searchAdded) {
            const parent = p.slice(0, p.lastIndexOf('/'));
            if (!loadedDirs.current.has(parent)) removable.push(p);
          }
          searchAdded.clear();
          if (removable.length > 0) {
            model.batch(
              removable.map((p) => ({ type: 'remove' as const, path: p })),
            );
          }
        }

        if (q.length === 0) return;

        try {
          const matches: string[] = [];
          await socket.search(q, (batch) => {
            matches.push(...batch);
          });
          if (cancelled || seq !== querySeq) return;

          const toAdd = new Set<string>();
          for (const m of matches) {
            const normalized = normalizePath(m, false);
            if (model.getItem(normalized) != null) continue;
            for (const ancestor of ancestorPaths(normalized)) {
              if (model.getItem(ancestor) == null) toAdd.add(ancestor);
            }
            toAdd.add(normalized);
          }

          if (toAdd.size === 0) return;

          const ordered = Array.from(toAdd).sort(
            (a, b) => a.split('/').length - b.split('/').length,
          );

          model.batch(ordered.map((p) => ({ type: 'add' as const, path: p })));

          for (const m of matches) {
            const normalized = normalizePath(m, false);
            if (ordered.includes(normalized)) searchAdded.add(normalized);
          }
        } catch {
          /* search is best-effort */
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
      };
    };

    tryAttach();

    return () => {
      cancelled = true;
      if (attachRaf) cancelAnimationFrame(attachRaf);
      cleanup?.();
    };
  }, [model, socket]);

  // ── Cleanup ────────────────────────────────────────────────────────

  useEffect(() => () => socket.close(), [socket]);

  // ── Mutators ───────────────────────────────────────────────────────

  const createFile = useCallback(
    (parentDir: string) => {
      clearError();
      const target = getUniquePath(model, `${parentDir}untitled`);
      userCreatePaths.current.add(target);
      model.add(target);
      model.startRenaming(target, { removeIfCanceled: true });
    },
    [model, clearError],
  );

  const createFolder = useCallback(
    (parentDir: string) => {
      clearError();
      const target = getUniquePath(model, `${parentDir}untitled/`);
      userCreatePaths.current.add(target);
      model.add(target);
      model.startRenaming(target, { removeIfCanceled: true });
    },
    [model, clearError],
  );

  const deletePath = useCallback(
    (path: string, isDir: boolean) => {
      clearError();
      userDeletePaths.current.add(path);
      model.remove(path, isDir ? { recursive: true } : undefined);
    },
    [model, clearError],
  );

  return {
    model,
    socket,
    error,
    gitStatus,
    isTreeLoading,
    createFile,
    createFolder,
    deletePath,
    refreshGitStatus,
    refresh,
    treeHostRef,
  };
}
