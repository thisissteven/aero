import { useSyncExternalStore } from 'react';

export interface WindowSize {
  width: number;
  height: number;
}

const SERVER_SNAPSHOT: WindowSize = { width: 0, height: 0 };

// Cached object reference to ensure immutability for useSyncExternalStore
let currentSnapshot: WindowSize = {
  width: typeof window !== 'undefined' ? window.innerWidth : 0,
  height: typeof window !== 'undefined' ? window.innerHeight : 0,
};

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};

  const updateSnapshot = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    // Only create a new object reference if dimensions actually changed
    if (currentSnapshot.width !== width || currentSnapshot.height !== height) {
      currentSnapshot = { width, height };
      callback();
    }
  };

  // ResizeObserver on documentElement tracks layout viewport changes accurately
  const observer = new ResizeObserver(updateSnapshot);
  observer.observe(document.documentElement);

  // Fallback for window-specific resize events
  window.addEventListener('resize', updateSnapshot);

  return () => {
    observer.disconnect();
    window.removeEventListener('resize', updateSnapshot);
  };
}

function getSnapshot(): WindowSize {
  return currentSnapshot;
}

function getServerSnapshot(): WindowSize {
  return SERVER_SNAPSHOT;
}

/**
 * Custom hook to subscribe to window dimensions.
 * Accepts an optional selector to slice state and minimize component re-renders.
 */
export function useWindowSize<T = WindowSize>(
  selector?: (size: WindowSize) => T,
): T {
  const size = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  return selector ? selector(size) : (size as unknown as T);
}
