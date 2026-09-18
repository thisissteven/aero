'use client';

import { Skeleton } from '@aero/ui';
import { EditProvider } from '@pierre/diffs/react';
import { useFileTreeSelection } from '@pierre/trees/react';
import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
} from 'react';
import { createEditor } from '@/app/components/chat-aside/files/edit-factory';
import { FileContentPane } from '@/app/components/chat-aside/files/file-content-pane';
import { FileExplorer } from '@/app/components/chat-aside/files/file-explorer';
import { FileTabs } from '@/app/components/chat-aside/files/file-tabs';
import {
  useActivePath,
  useFileViewerStore,
  useOpenPaths,
} from '@/app/components/chat-aside/files/file-viewer-store';
import { useLazyFileTree } from '@/app/components/chat-aside/files/use-lazy-file-tree';
import { useLocalStorageState } from '@/app/components/chat-aside/files/use-persistent-state';
import { useSession, useSessionDirectory } from '@/app/hooks/api/sessions';
import { useSessionId } from '@/app/providers/SessionIdProvider';

const DEFAULT_EXPLORER_WIDTH = 288;
const MIN_EXPLORER_WIDTH = 200;
const MAX_EXPLORER_WIDTH = 600;
const EXPLORER_WIDTH_STORAGE_KEY = 'aero:file-explorer:width';

export function FileExplorerPanel() {
  const sessionId = useSessionId();

  const directory = useSessionDirectory();

  const { isLoading } = useSession(undefined, sessionId);

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

  if (!directory) {
    return (
      <div className='text-muted flex h-full w-full flex-1 items-center justify-center p-6 text-center text-sm'>
        Open a workspace to browse its files.
      </div>
    );
  }

  return <FileExplorerPanelInner key={directory} root={directory} />;
}

function FileExplorerPanelInner({ root }: { root: string }) {
  const lazyFileTree = useLazyFileTree({ root });
  const { model, socket } = lazyFileTree;

  const [explorerWidth, setExplorerWidth] = useLocalStorageState<number>(
    EXPLORER_WIDTH_STORAGE_KEY,
    DEFAULT_EXPLORER_WIDTH,
  );

  // ── Tab state (store-owned) ─────────────────────────────────────────
  const openPaths = useOpenPaths();
  const activePath = useActivePath();
  const openFile = useFileViewerStore((s) => s.openFile);
  const activateTab = useFileViewerStore((s) => s.activateTab);
  const closeTab = useFileViewerStore((s) => s.closeTab);

  // ── Tree selection ⇄ active tab sync ─────────────────────────────────
  //
  // Two effects, one suppression flag. When we programmatically change the
  // tree selection (direction 2), we set the flag so the tree → tab effect
  // (direction 1) ignores the change we just caused.

  const suppressSelectionSyncRef = useRef(false);
  const selectedPaths = useFileTreeSelection(model);
  const lastHandledSelectionRef = useRef<readonly string[]>(selectedPaths);

  useLayoutEffect(() => {
    useFileViewerStore.getState().setActiveRoot(root);
  }, [root]);

  // Direction 1: tree → store.
  useEffect(() => {
    if (selectedPaths === lastHandledSelectionRef.current) return;
    const previous = new Set(lastHandledSelectionRef.current);
    lastHandledSelectionRef.current = selectedPaths;

    if (suppressSelectionSyncRef.current) {
      suppressSelectionSyncRef.current = false;
      return;
    }

    for (let i = selectedPaths.length - 1; i >= 0; i--) {
      const candidate = selectedPaths[i];
      if (previous.has(candidate)) continue;
      const item = model.getItem(candidate);
      if (!item || item.isDirectory()) continue;
      openFile(candidate.replace(/\/$/, ''));
      break;
    }
  }, [selectedPaths, model, openFile]);

  // Direction 2: store → tree.
  useEffect(() => {
    let selectionChanged = false;

    if (activePath == null) {
      // All tabs closed — deselect everything so the tree isn't stuck on a
      // file that no longer has a tab.
      for (const selectedPath of model.getSelectedPaths()) {
        model.getItem(selectedPath)?.deselect();
        selectionChanged = true;
      }
    } else {
      const activeItem = model.getItem(activePath);
      if (activeItem == null) return;

      for (const selectedPath of model.getSelectedPaths()) {
        if (selectedPath === activePath) continue;
        model.getItem(selectedPath)?.deselect();
        selectionChanged = true;
      }
      if (!activeItem.isSelected()) {
        activeItem.select();
        selectionChanged = true;
      }
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
    <EditProvider createEditor={createEditor}>
      <div className='flex h-full min-h-0 w-full'>
        <FileExplorer
          {...lazyFileTree}
          projectName={projectName}
          className='shrink-0'
          style={{ width: explorerWidth }}
          root={root}
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
          <div className='min-h-0 min-w-0 flex-1 @container'>
            <FileContentPane
              socket={socket}
              getFileUrl={(rel) =>
                `/api/fs/raw?root=${encodeURIComponent(root)}&path=${encodeURIComponent(rel)}`
              }
            />
          </div>
        </div>
      </div>
    </EditProvider>
  );
}
