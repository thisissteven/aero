'use client';

import type { FileTree as FileTreeModel } from '@pierre/trees';
import { FILE_TREE_DENSITY_PRESETS } from '@pierre/trees';
import { useFileTree } from '@pierre/trees/react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  beginFileWrite,
  completeFileWrite,
  invalidateFile,
} from '@/app/components/chat-aside/files/file-invalidation-store';
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
  deletePath: (path: string, isDir: boolean) => void;
  refreshGitStatus: () => void;
  refresh: () => void;
  treeHostRef: React.RefObject<HTMLElement | null>;
}

const DEFAULT_DENSITY = 'default' as const;
const DEFAULT_VIEWPORT_HEIGHT = 600;

const COMPOSITION = {
  contextMenu: { enabled: true, triggerMode: 'right-click' },
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

interface MoveOp {
  from: string;
  to: string;
}

function coalesceMoves(moves: readonly MoveOp[]): MoveOp[] {
  const sorted = [...moves].sort((a, b) => a.from.length - b.from.length);
  const kept: MoveOp[] = [];
  for (const move of sorted) {
    const fromClean = cleanPath(move.from);
    if (kept.some((k) => fromClean.startsWith(`${cleanPath(k.from)}/`))) {
      continue;
    }
    kept.push(move);
  }
  return kept;
}

function normPending(p: string): string {
  return p.replace(/\/$/, '');
}

function useDirectoryExpansionWatcher(
  model: FileTreeModel,
  onExpand: (path: string) => void,
  knownExpanded: React.MutableRefObject<Set<string>>,
): React.MutableRefObject<() => void> {
  const onExpandRef = useRef(onExpand);
  onExpandRef.current = onExpand;

  const pokeRef = useRef<() => void>(() => {
    //
  });

  useEffect(() => {
    let lastCount = -1;

    const scan = (force: boolean) => {
      const count = model.getVisibleCount();
      if (count === 0) {
        lastCount = 0;
        return;
      }
      if (!force && count === lastCount) return;
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

    const runScan = () => scan(false);
    pokeRef.current = () => scan(true);

    runScan();
    const unsubscribe = model.subscribe(runScan);
    return () => {
      pokeRef.current = () => {
        //
      };
      unsubscribe();
    };
  }, [model, knownExpanded]);

  return pokeRef;
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

  // ── Shared mutation queue ──────────────────────────────────────────
  //
  // Every write, rename, mkdir, and delete goes through this queue, so
  // operations happen in the order the user issued them. `deletePath` uses
  // the same queue as the tree's mutation events — no race between a
  // create-then-delete or rename-then-delete sequence.

  const mutationTailRef = useRef<Promise<unknown>>(Promise.resolve());

  const enqueue = useCallback(
    (fn: () => Promise<unknown>) => {
      mutationTailRef.current = mutationTailRef.current
        .then(fn)
        .catch(reportError);
    },
    [reportError],
  );

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

  const knownExpanded = useRef(new Set<string>());
  const pokeExpansionScan = useDirectoryExpansionWatcher(
    model,
    loadDirectory,
    knownExpanded,
  );
  useSelectionWatcher(model);

  const refresh = useCallback(() => {
    loadedDirs.current.clear();
    loadedDirs.current.add('');
    knownExpanded.current.clear();
    socket
      .list('')
      .then((result) => {
        model.resetPaths(
          result.entries.map((e) => normalizePath(e.path, e.kind === 'dir')),
        );
        pokeExpansionScan.current();
      })
      .catch((err) => {
        reportError(
          err instanceof Error ? err : new Error('Failed to refresh'),
        );
      });
    refreshGitStatus();
  }, [model, socket, reportError, refreshGitStatus, pokeExpansionScan]);

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

  // ── Mutation → FS bridge (creates and renames only) ────────────────
  //
  // Deletes no longer flow through here. `deletePath` fires the server
  // delete directly, so the tree's `remove` events (which fire for internal
  // reasons too: search cleanup, flatten reflow, rename-mode reset, and
  // every descendant of a user-deleted folder) are all ignored.
  //
  // Placeholders are tracked in `pendingCreates` from the moment
  // createFile/createFolder is called, not inferred from add events. That
  // removes any dependency on event ordering.

  const pendingCreates = useRef(new Set<string>());

  useEffect(() => {
    const queue: Array<
      | { kind: 'move'; from: string; to: string }
      | { kind: 'remove'; path: string }
    > = [];
    let drainScheduled = false;

    const drain = () => {
      drainScheduled = false;
      if (queue.length === 0) return;

      const events = queue.splice(0, queue.length);
      const moves: MoveOp[] = [];
      const removes: string[] = [];

      // Pass 1: classify. Placeholder renames (from a pending path) are
      // handled inline as creates. Everything else is a real move. Removes
      // are deferred — they need to be processed AFTER all moves so a
      // remove('untitled') that fires alongside move('untitled'→'foo.txt')
      // doesn't clear the pending marker before the move is seen.
      for (const e of events) {
        if (e.kind === 'move') {
          const fromNorm = normPending(e.from);
          const wasPending = pendingCreates.current.has(fromNorm);
          if (wasPending) pendingCreates.current.delete(fromNorm);

          if (wasPending) {
            const cleanTo = normPending(e.to);
            const isDir = e.to.endsWith('/');

            // Release the placeholder's pending counter and arm the target.
            completeFileWrite(fromNorm);
            beginFileWrite(cleanTo);

            // Rename the placeholder tab in place, so the 'untitled' tab
            // becomes 'foo.txt' rather than leaving a leftover.
            useFileViewerStore.getState().renamePath(fromNorm, cleanTo);

            enqueue(async () => {
              try {
                if (isDir) {
                  await socket.mkdir(cleanTo);
                } else {
                  await socket.writeFile(cleanTo, '');
                }
              } finally {
                completeFileWrite(cleanTo);
              }
            });

            pendingCreates.current.add(cleanTo);
          } else {
            moves.push({ from: e.from, to: e.to });
          }
        } else if (e.kind === 'remove') {
          removes.push(e.path);
        }
      }

      // Pass 2: real renames. Rename the tab in place too.
      if (moves.length > 0) {
        for (const m of coalesceMoves(moves)) {
          const cleanFrom = cleanPath(m.from);
          const cleanTo = cleanPath(m.to);

          useFileViewerStore.getState().renamePath(cleanFrom, cleanTo);

          beginFileWrite(cleanTo);
          enqueue(async () => {
            try {
              await socket.rename(cleanFrom, cleanTo);
            } finally {
              completeFileWrite(cleanTo);
              invalidateFile(cleanFrom);
            }
          });
        }
        scheduleGitRefresh();
      }

      // Pass 3: removes. Only ones still in pendingCreates are cancelled
      // placeholders. Everything else is internal tree cleanup and ignored.
      for (const r of removes) {
        const key = normPending(r);
        if (pendingCreates.current.has(key)) {
          pendingCreates.current.delete(key);
          completeFileWrite(key);
          useFileViewerStore.getState().removePathAndDescendants(key);
        }
      }
    };

    const unsubscribe = model.onMutation('*', (event) => {
      const events = event.operation === 'batch' ? event.events : [event];
      for (const e of events) {
        if (e.operation === 'move') {
          queue.push({ kind: 'move', from: e.from, to: e.to });
        } else if (e.operation === 'remove') {
          // Queued, not handled inline. The drain needs to see all events
          // of a batch before deciding what a remove means.
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
    };
  }, [model, socket, scheduleGitRefresh, enqueue]);

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
      const key = normPending(target);
      pendingCreates.current.add(key);
      beginFileWrite(key); // ← new
      model.add(target);
      model.startRenaming(target, { removeIfCanceled: true });
    },
    [model, clearError],
  );

  const createFolder = useCallback(
    (parentDir: string) => {
      clearError();
      const target = getUniquePath(model, `${parentDir}untitled/`);
      const key = normPending(target);
      pendingCreates.current.add(key);
      beginFileWrite(key); // ← new
      model.add(target);
      model.startRenaming(target, { removeIfCanceled: true });
    },
    [model, clearError],
  );

  const deletePath = useCallback(
    (path: string, isDir: boolean) => {
      clearError();
      const clean = cleanPath(path);

      // 1) Sync the UI immediately, before the server round-trip. Removes
      //    the path (and any tab under it, for directories) from the
      //    viewer store. The pane's read effect sees activePath change and
      //    re-renders accordingly.
      useFileViewerStore.getState().removePathAndDescendants(clean);

      // 2) Fire the server delete directly. Not via the tree's remove
      //    event — that mechanism is unreliable in path shape and ordering.
      enqueue(async () => {
        await socket.deletePath(clean, isDir);
        invalidateFile(clean);
      });

      // 3) Update the tree's UI. Fires internal remove events which the
      //    mutation handler ignores. Placeholder-cleanup bookkeeping also
      //    drops anything pending that matches this path.
      pendingCreates.current.delete(normPending(clean));
      model.remove(path, isDir ? { recursive: true } : undefined);

      scheduleGitRefresh();
    },
    [model, socket, clearError, enqueue, scheduleGitRefresh],
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
