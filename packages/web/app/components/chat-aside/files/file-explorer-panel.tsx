'use client';

import { Skeleton } from '@aero/ui';
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
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

function FileExplorerPanelInner({ root }: { root: string }) {
  const lazyFileTree = useLazyFileTree({ root });

  // Tabs are persisted per-workspace in sessionStorage so the aside can be
  // closed/reopened (or the panel remounted) without losing open files.
  const [tabState, setTabState] = useSessionStorageState<TabState>(
    `aero:file-explorer:tabs:${root}`,
    { openPaths: [], activePath: null },
  );

  const [explorerWidth, setExplorerWidth] = useLocalStorageState<number>(
    EXPLORER_WIDTH_STORAGE_KEY,
    DEFAULT_EXPLORER_WIDTH,
  );

  const { openPaths, activePath } = tabState;

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
        const nextActive =
          nextOpen[idx] ??
          nextOpen[idx - 1] ??
          nextOpen[nextOpen.length - 1] ??
          null;

        return { openPaths: nextOpen, activePath: nextActive };
      });
    },
    [setTabState],
  );

  const activateTab = useCallback(
    (path: string) => {
      setTabState((prev) =>
        prev.activePath === path ? prev : { ...prev, activePath: path },
      );
    },
    [setTabState],
  );

  const projectName = useMemo(() => {
    const clean = root.replace(/\/$/, '');
    return clean.split('/').pop() || clean || 'workspace';
  }, [root]);

  const resizeStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );

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
      // Explorer is on the left; dragging right widens it.
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
        onOpenFile={openFile}
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
          <FileContentPane socket={lazyFileTree.socket} path={activePath} />
        </div>
      </div>
    </div>
  );
}
