'use client';

import { useCallback, useLayoutEffect, useState } from 'react';

function readStorage<T>(storage: Storage | null, key: string, fallback: T): T {
  if (!storage) return fallback;
  try {
    const raw = storage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function useStorageState<T>(
  getStorage: () => Storage | null,
  key: string,
  defaultValue: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const [value, setValue] = useState<T>(defaultValue);

  // useLayoutEffect so the stored value is applied before the browser
  // paints the default — prevents a visible jump for width, and avoids
  // hydration mismatches because the first render still uses the default.
  useLayoutEffect(() => {
    setValue(readStorage(getStorage(), key, defaultValue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  const update = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValue((prev) => {
        const resolved =
          typeof next === 'function' ? (next as (p: T) => T)(prev) : next;
        try {
          getStorage()?.setItem(key, JSON.stringify(resolved));
        } catch {
          // quota / privacy mode — ignore
        }
        return resolved;
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [key],
  );

  return [value, update];
}

export function useLocalStorageState<T>(key: string, defaultValue: T) {
  return useStorageState<T>(
    () => (typeof window === 'undefined' ? null : window.localStorage),
    key,
    defaultValue,
  );
}

export function useSessionStorageState<T>(key: string, defaultValue: T) {
  return useStorageState<T>(
    () => (typeof window === 'undefined' ? null : window.sessionStorage),
    key,
    defaultValue,
  );
}
