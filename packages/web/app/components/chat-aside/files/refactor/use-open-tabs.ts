import type { FileTree as FileTreeModel } from '@pierre/trees';
import { useFileTreeSelection } from '@pierre/trees/react';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  remapMovedPath,
  remapMovedPaths,
} from '@/app/components/chat-aside/files/refactor/tree-app-utils';
import { useLatestValueRef } from '@/app/components/chat-aside/files/temp/lib/useLatestValueRef';

interface UseOpenTabsOptions {
  initialActivePath?: string | null;
  initialOpenPaths?: readonly string[];
  // When true, the hook collapses to a single-file view.
  isMobile?: boolean;
  model: FileTreeModel;
  // When provided, open tabs + active path persist to sessionStorage under
  // this key so an unmount/remount restores the same workspace.
  storageKey?: string;
}

interface UseOpenTabsResult {
  activePath: string | null;
  activateTab: (path: string) => void;
  closeTab: (path: string) => void;
  openPaths: readonly string[];
}

interface StoredTabsState {
  activePath: string | null;
  openPaths: readonly string[];
}

function readStoredTabsState(
  storageKey: string | undefined,
): StoredTabsState | null {
  if (storageKey == null || typeof window === 'undefined') {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(`${storageKey}:tabs`);
    if (raw == null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) {
      return null;
    }
    const candidate = parsed as { activePath?: unknown; openPaths?: unknown };
    if (!Array.isArray(candidate.openPaths)) {
      return null;
    }
    return {
      activePath:
        typeof candidate.activePath === 'string' ? candidate.activePath : null,
      openPaths: candidate.openPaths.filter(
        (entry): entry is string => typeof entry === 'string',
      ),
    };
  } catch {
    // Malformed / unavailable storage falls back to the caller's initial state.
    return null;
  }
}

// Connects tree selection to a tab list. When the user selects a file in the
// tree we ensure that file has a tab and focus it. Directory selections are
// ignored on purpose.
export function useOpenTabs({
  initialActivePath,
  initialOpenPaths,
  isMobile = false,
  model,
  storageKey,
}: UseOpenTabsOptions): UseOpenTabsResult {
  // Session state is read once, on first mount. Subsequent renders must not
  // re-read, so we keep it in a ref-resolved initializer.
  const storedStateRef = useRef<StoredTabsState | null | undefined>(undefined);
  if (storedStateRef.current === undefined) {
    storedStateRef.current = readStoredTabsState(storageKey);
  }
  const storedState = storedStateRef.current;

  const [openPaths, setOpenPaths] = useState<readonly string[]>(() => {
    if (storedState != null) {
      return storedState.openPaths;
    }
    const seed = initialOpenPaths ? [...initialOpenPaths] : [];
    if (
      initialActivePath != null &&
      initialActivePath !== '' &&
      !seed.includes(initialActivePath)
    ) {
      seed.push(initialActivePath);
    }
    return seed;
  });
  const [activePath, setActivePath] = useState<string | null>(() => {
    if (storedState != null) {
      return storedState.activePath;
    }
    return initialActivePath ?? null;
  });

  // Refs keep the tab handlers stable while still reading the newest state, so
  // two quick clicks (switch then close) cannot act on a stale snapshot.
  const openPathsRef = useLatestValueRef(openPaths);
  const activePathRef = useLatestValueRef(activePath);

  const selectedPaths = useFileTreeSelection(model);

  // Track which selected paths we have already turned into tabs so a re-render
  // does not re-open a tab the user just closed.
  const lastHandledSelectionRef = useRef<readonly string[]>(selectedPaths);
  // Set while TreeApp itself changes the tree selection (activating a tab,
  // closing the active tab) so the selection -> tabs effect doesn't bounce
  // back and undo the change the user just made.
  const suppressSelectionSyncRef = useRef(false);

  // Persist the tab workspace so an unmount/remount restores the same state.
  useEffect(() => {
    if (storageKey == null || typeof window === 'undefined') {
      return;
    }
    try {
      window.sessionStorage.setItem(
        `${storageKey}:tabs`,
        JSON.stringify({ activePath, openPaths }),
      );
    } catch {
      // Persistence is best-effort.
    }
  }, [activePath, openPaths, storageKey]);

  useEffect(() => {
    if (selectedPaths === lastHandledSelectionRef.current) {
      return;
    }
    const previous = new Set(lastHandledSelectionRef.current);
    lastHandledSelectionRef.current = selectedPaths;

    if (suppressSelectionSyncRef.current) {
      // The selection change came from our own active-tab sync; it is not the
      // user opening a file, so don't rewrite the tab state.
      suppressSelectionSyncRef.current = false;
      return;
    }

    // Find the most recently added selection that is a file (not directory).
    for (let index = selectedPaths.length - 1; index >= 0; index -= 1) {
      const candidate = selectedPaths[index];
      if (previous.has(candidate)) {
        continue;
      }
      const item = model.getItem(candidate);
      if (item == null || item.isDirectory()) {
        continue;
      }
      setOpenPaths((current) => {
        if (isMobile) {
          return current.length === 1 && current[0] === candidate
            ? current
            : [candidate];
        }
        return current.includes(candidate) ? current : [...current, candidate];
      });
      setActivePath(candidate);
      break;
    }
  }, [isMobile, model, selectedPaths]);

  // When the viewport flips into mobile, discard any extra desktop tabs before
  // committing the mobile layout. Returning to desktop does not restore them.
  if (
    isMobile &&
    (openPaths.length !== (activePath == null ? 0 : 1) ||
      (activePath != null && openPaths[0] !== activePath))
  ) {
    setOpenPaths(activePath == null ? [] : [activePath]);
  }

  const closeTab = useCallback(
    (path: string) => {
      const currentOpen = openPathsRef.current;
      if (!currentOpen.includes(path)) {
        return;
      }

      const wasActive = activePathRef.current === path;
      if (wasActive) {
        const item = model.getItem(path);
        if (item?.isSelected() === true) {
          suppressSelectionSyncRef.current = true;
          item.deselect();
        }
      }

      const nextOpen = currentOpen.filter((entry) => entry !== path);
      setOpenPaths(nextOpen);

      if (wasActive) {
        if (nextOpen.length === 0) {
          setActivePath(null);
        } else {
          const closedIndex = currentOpen.indexOf(path);
          const fallbackIndex = Math.min(closedIndex, nextOpen.length - 1);
          setActivePath(nextOpen[fallbackIndex] ?? null);
        }
      }
    },
    [activePathRef, model, openPathsRef],
  );

  const activateTab = useCallback((path: string) => {
    setOpenPaths((current) =>
      current.includes(path) ? current : [...current, path],
    );
    setActivePath(path);
  }, []);

  useEffect(() => {
    if (activePath == null) {
      return;
    }

    const activeItem = model.getItem(activePath);
    if (activeItem == null) {
      return;
    }

    let selectionChanged = false;
    for (const selectedPath of model.getSelectedPaths()) {
      if (selectedPath === activePath) {
        continue;
      }
      model.getItem(selectedPath)?.deselect();
      selectionChanged = true;
    }

    if (!activeItem.isSelected()) {
      activeItem.select();
      selectionChanged = true;
    }

    if (selectionChanged) {
      // Prevent the selection -> tabs effect from interpreting our own sync
      // as a user selection and rewriting the tab state.
      suppressSelectionSyncRef.current = true;
    }
  }, [activePath, model]);

  useEffect(
    () =>
      model.onMutation('*', (event) => {
        const moveEvents =
          event.operation === 'move'
            ? [event]
            : event.operation === 'batch'
              ? event.events.filter((entry) => entry.operation === 'move')
              : [];
        if (moveEvents.length === 0) {
          return;
        }

        setOpenPaths((current) => {
          let nextPaths = current;
          for (const moveEvent of moveEvents) {
            nextPaths = remapMovedPaths(
              nextPaths,
              moveEvent.from,
              moveEvent.to,
            );
          }
          return nextPaths;
        });
        setActivePath((current) => {
          if (current == null) {
            return current;
          }

          let nextPath = current;
          for (const moveEvent of moveEvents) {
            nextPath = remapMovedPath(nextPath, moveEvent.from, moveEvent.to);
          }
          return nextPath;
        });
      }),
    [model],
  );

  return { activePath, activateTab, closeTab, openPaths };
}
