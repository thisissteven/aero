import { useSyncExternalStoreWithSelector } from 'use-sync-external-store/shim/with-selector';

export interface WindowSize {
  width: number;
  height: number;
}

const SERVER_SNAPSHOT: WindowSize = { width: 0, height: 0 };

let currentSnapshot: WindowSize = {
  width: typeof window !== 'undefined' ? window.innerWidth : 0,
  height: typeof window !== 'undefined' ? window.innerHeight : 0,
};

function subscribe(callback: () => void) {
  if (typeof window === 'undefined') return () => {};

  const updateSnapshot = () => {
    const width = window.innerWidth;
    const height = window.innerHeight;

    if (currentSnapshot.width !== width || currentSnapshot.height !== height) {
      currentSnapshot = { width, height };
      callback();
    }
  };

  const observer = new ResizeObserver(updateSnapshot);
  observer.observe(document.documentElement);

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
 * Custom hook untuk subscribe ke ukuran window secara efisien.
 * Menggunakan selector untuk mencegah re-render jika field yang di-select tidak berubah.
 */
export function useWindowSize<T = WindowSize>(
  selector?: (size: WindowSize) => T,
): T {
  const defaultSelector = (size: WindowSize) => size as unknown as T;

  return useSyncExternalStoreWithSelector(
    subscribe,
    getSnapshot,
    getServerSnapshot,
    selector ?? defaultSelector,
  );
}
