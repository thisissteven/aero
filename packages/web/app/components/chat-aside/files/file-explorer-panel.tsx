'use client';

import { Skeleton } from '@aero/ui';
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import { FileContentPane } from '@/app/components/chat-aside/files/file-content-pane';
import { FileExplorer } from '@/app/components/chat-aside/files/file-explorer';
import { useLazyFileTree } from '@/app/components/chat-aside/files/use-lazy-file-tree';
import { useSession } from '@/app/hooks/api/sessions';
import { useSessionId } from '@/app/providers/SessionIdProvider';

const DEFAULT_EXPLORER_WIDTH = 288;
const MIN_EXPLORER_WIDTH = 200;
const MAX_EXPLORER_WIDTH = 600;

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

function FileExplorerPanelInner({ root }: { root: string }) {
  const lazyFileTree = useLazyFileTree({ root });

  const [openPaths, setOpenPaths] = useState<readonly string[]>([]);
  const [activePath, setActivePath] = useState<string | null>(null);
  const [explorerWidth, setExplorerWidth] = useState(DEFAULT_EXPLORER_WIDTH);

  const openPathsRef = useRef(openPaths);
  openPathsRef.current = openPaths;

  const openFile = useCallback((path: string) => {
    setOpenPaths((current) =>
      current.includes(path) ? current : [...current, path],
    );
    setActivePath(path);
  }, []);

  const closeTab = useCallback((path: string) => {
    setOpenPaths((current) => current.filter((p) => p !== path));
    setActivePath((currentActive) => {
      if (currentActive !== path) return currentActive;
      const remaining = openPathsRef.current.filter((p) => p !== path);
      return remaining[remaining.length - 1] ?? null;
    });
  }, []);

  const projectName = useMemo(() => {
    const clean = root.replace(/\/$/, '');
    return clean.split('/').pop() || clean || 'workspace';
  }, [root]);

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
      // Explorer is on the left; dragging right widens it.
      const delta = event.clientX - state.startX;
      const next = Math.max(
        MIN_EXPLORER_WIDTH,
        Math.min(MAX_EXPLORER_WIDTH, state.startWidth + delta),
      );
      setExplorerWidth(next);
    },
    [],
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
        className="relative w-px shrink-0 cursor-col-resize bg-separator after:absolute after:inset-y-0 after:-left-1 after:w-2 after:content-['']"
      />

      <div className='flex min-h-0 min-w-0 flex-1 flex-col'>
        {openPaths.length > 0 ? (
          <TabBar
            openPaths={openPaths}
            activePath={activePath}
            onActivate={setActivePath}
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

interface TabBarProps {
  openPaths: readonly string[];
  activePath: string | null;
  onActivate: (path: string) => void;
  onClose: (path: string) => void;
}

function TabBar({ openPaths, activePath, onActivate, onClose }: TabBarProps) {
  return (
    <div className='flex h-10 shrink-0 items-center gap-1 overflow-x-auto border-b border-separator bg-background px-2'>
      {openPaths.map((path) => {
        const isActive = path === activePath;
        const name = path.split('/').pop() || path;
        return (
          <div
            key={path}
            className={[
              'group flex h-7 max-w-[200px] shrink-0 items-center gap-1 overflow-hidden rounded-md pl-2 pr-1 text-xs transition-colors',
              isActive
                ? 'bg-surface-hover text-foreground'
                : 'text-muted hover:bg-surface-hover hover:text-foreground',
            ].join(' ')}
          >
            <button
              type='button'
              onClick={() => onActivate(path)}
              className='min-w-0 flex-1 truncate text-left'
              title={path}
            >
              {name}
            </button>
            <button
              type='button'
              onClick={() => onClose(path)}
              aria-label={`Close ${name}`}
              className='flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted opacity-0 transition-opacity hover:bg-surface-hover hover:text-foreground group-hover:opacity-100 focus-visible:opacity-100'
            >
              <svg
                width='10'
                height='10'
                viewBox='0 0 10 10'
                aria-hidden='true'
              >
                <path
                  d='M1 1l8 8M9 1L1 9'
                  stroke='currentColor'
                  strokeWidth='1.5'
                  strokeLinecap='round'
                />
              </svg>
            </button>
          </div>
        );
      })}
    </div>
  );
}
