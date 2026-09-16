'use client';

import { Skeleton } from '@aero/ui';
import { useFileTreeSelection } from '@pierre/trees/react';
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
} from 'react';

import { FileContentPane } from '@/app/components/chat-aside/files/file-content-pane';
import { FileExplorer } from '@/app/components/chat-aside/files/file-explorer';
import { FileTabs } from '@/app/components/chat-aside/files/file-tabs';
import { useLazyFileTree } from '@/app/components/chat-aside/files/use-lazy-file-tree';
import {
  useLocalStorageState,
  useSessionStorageState,
} from '@/app/components/chat-aside/files/use-persistent-state';
import { useSession } from '@/app/hooks/api/sessions';
import { useSessionId } from '@/app/providers/SessionIdProvider';

const DEFAULT_EXPLORER_WIDTH = 288;
const MIN_EXPLORER_WIDTH = 200;
const MAX_EXPLORER_WIDTH = 600;
const EXPLORER_WIDTH_STORAGE_KEY = 'aero:file-explorer:width';

export function FileExplorerPanel() {
  const sessionId = useSessionId();
  const { data: session, isLoading } = useSession(undefined, sessionId);

  if (!sessionId) {
    return (
      <div className='text-muted flex h-full w-full flex-1 items-center justify-center p-6 text-center text-sm'>
        Open a session to browse its files.
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className='relative h-full w-full'>
        <div className='absolute inset-0 space-y-3 p-4 opacity-60 dark:opacity-50'>
          <Skeleton className='h-8 w-full' />
          <Skeleton className='h-6 w-3/4' />
          <Skeleton className='h-64 w-full' />
        </div>
      </div>
    );
  }

  if (!session) return null;

  return (
    <FileExplorerPanelInner key={session.workspace} root={session.workspace} />
  );
}

interface TabState {
  openPaths: string[];
  activePath: string | null;
}

const EMPTY_TAB_STATE: TabState = { openPaths: [], activePath: null };

function FileExplorerPanelInner({ root }: { root: string }) {
  const lazyFileTree = useLazyFileTree({ root });
  const { model, socket } = lazyFileTree;

  // Tabs persist per-workspace in sessionStorage so closing/reopening the
  // aside (or any remount) restores the same open files.
  const [tabState, setTabState] = useSessionStorageState<TabState>(
    `aero:file-explorer:tabs:${root}`,
    EMPTY_TAB_STATE,
  );
  const [explorerWidth, setExplorerWidth] = useLocalStorageState<number>(
    EXPLORER_WIDTH_STORAGE_KEY,
    DEFAULT_EXPLORER_WIDTH,
  );

  const { openPaths, activePath } = tabState;

  // ── Tab state mutations (atomic) ─────────────────────────────────────
  //
  // Every mutation goes through one functional update on the whole TabState
  // object, so openPaths and activePath can never disagree, and two quick
  // clicks can never race on a stale snapshot.

  const openFile = useCallback(
    (path: string) => {
      setTabState((prev) => {
        if (prev.activePath === path && prev.openPaths.includes(path)) {
          return prev;
        }
        return {
          openPaths: prev.openPaths.includes(path)
            ? prev.openPaths
            : [...prev.openPaths, path],
          activePath: path,
        };
      });
    },
    [setTabState],
  );

  const activateTab = useCallback(
    (path: string) => {
      setTabState((prev) => {
        if (prev.activePath === path) return prev;
        return {
          openPaths: prev.openPaths.includes(path)
            ? prev.openPaths
            : [...prev.openPaths, path],
          activePath: path,
        };
      });
    },
    [setTabState],
  );

  const closeTab = useCallback(
    (path: string) => {
      setTabState((prev) => {
        const idx = prev.openPaths.indexOf(path);
        if (idx === -1) return prev;

        const nextOpen = prev.openPaths.filter((p) => p !== path);

        if (prev.activePath !== path) {
          return { openPaths: nextOpen, activePath: prev.activePath };
        }

        // Prefer the tab that slid into this slot, else the one before it.
        const nextActive = nextOpen[idx] ?? nextOpen[idx - 1] ?? null;
        return { openPaths: nextOpen, activePath: nextActive };
      });
    },
    [setTabState],
  );

  // ── Tree selection ⇄ active tab sync ─────────────────────────────────
  //
  // Two effects, one suppression flag. When we programmatically change the
  // tree selection (direction 2), we set the flag so the tree → tab effect
  // (direction 1) ignores the change we just caused. Without this, closing
  // the active tab deselects it in the tree, and the tree effect
  // immediately re-opens it — that's the "sometimes doesn't close" bug.

  const suppressSelectionSyncRef = useRef(false);
  const selectedPaths = useFileTreeSelection(model);
  const lastHandledSelectionRef = useRef<readonly string[]>(selectedPaths);

  // Direction 1: tree → tab.
  useEffect(() => {
    if (selectedPaths === lastHandledSelectionRef.current) return;
    const previous = new Set(lastHandledSelectionRef.current);
    lastHandledSelectionRef.current = selectedPaths;

    if (suppressSelectionSyncRef.current) {
      suppressSelectionSyncRef.current = false;
      return;
    }

    // Walk backwards so we act on the most recently added selection, which
    // matches "the one the user just clicked".
    for (let i = selectedPaths.length - 1; i >= 0; i--) {
      const candidate = selectedPaths[i];
      if (previous.has(candidate)) continue;
      const item = model.getItem(candidate);
      if (!item || item.isDirectory()) continue;
      openFile(candidate.replace(/\/$/, ''));
      break;
    }
  }, [selectedPaths, model, openFile]);

  // Direction 2: activePath → tree.
  useEffect(() => {
    if (activePath == null) return;
    const activeItem = model.getItem(activePath);
    if (activeItem == null) return;

    let selectionChanged = false;
    for (const selectedPath of model.getSelectedPaths()) {
      if (selectedPath === activePath) continue;
      model.getItem(selectedPath)?.deselect();
      selectionChanged = true;
    }
    if (!activeItem.isSelected()) {
      activeItem.select();
      selectionChanged = true;
    }
    if (selectionChanged) {
      suppressSelectionSyncRef.current = true;
    }
  }, [activePath, model]);

  const projectName = useMemo(() => {
    const clean = root.replace(/\/$/, '');
    return clean.split('/').pop() || clean || 'workspace';
  }, [root]);

  // ── Resize ───────────────────────────────────────────────────────────

  const resizeStateRef = useRef<{
    startX: number;
    startWidth: number;
  } | null>(null);

  const onResizeStart = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) return;
      event.preventDefault();
      event.currentTarget.setPointerCapture(event.pointerId);
      resizeStateRef.current = {
        startX: event.clientX,
        startWidth: explorerWidth,
      };
    },
    [explorerWidth],
  );

  const onResizeMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const state = resizeStateRef.current;
      if (state == null) return;
      const delta = event.clientX - state.startX;
      const next = Math.max(
        MIN_EXPLORER_WIDTH,
        Math.min(MAX_EXPLORER_WIDTH, state.startWidth + delta),
      );
      setExplorerWidth(next);
    },
    [setExplorerWidth],
  );

  const onResizeEnd = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (resizeStateRef.current == null) return;
      resizeStateRef.current = null;
      if (event.currentTarget.hasPointerCapture(event.pointerId)) {
        event.currentTarget.releasePointerCapture(event.pointerId);
      }
    },
    [],
  );

  return (
    <div className='flex h-full min-h-0 w-full'>
      <FileExplorer
        {...lazyFileTree}
        projectName={projectName}
        className='shrink-0'
        style={{ width: explorerWidth }}
      />

      <div
        role='separator'
        aria-orientation='vertical'
        aria-label='Resize file explorer'
        onPointerDown={onResizeStart}
        onPointerMove={onResizeMove}
        onPointerUp={onResizeEnd}
        onPointerCancel={onResizeEnd}
        className="relative w-[0.5px] shrink-0 cursor-ew-resize after:absolute after:inset-y-0 after:-left-1 after:w-2 after:content-['']"
      />

      <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
        {openPaths.length > 0 ? (
          <FileTabs
            openPaths={openPaths}
            activePath={activePath}
            onActivate={activateTab}
            onClose={closeTab}
          />
        ) : null}
        <div className='min-h-0 min-w-0 flex-1'>
          <FileContentPane socket={socket} path={activePath} />
        </div>
      </div>
    </div>
  );
}
