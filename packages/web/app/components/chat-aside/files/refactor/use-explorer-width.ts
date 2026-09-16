import type { PointerEvent as ReactPointerEvent } from 'react';
import { useCallback, useEffect, useRef, useState } from 'react';

// Owns the explorer sidebar width and exposes a pointer-down handler for the
// drag handle. Uses pointer capture so the drag continues smoothly even if the
// pointer leaves the handle element. When a storageKey is supplied the width
// is persisted to localStorage so it survives across sessions.
export function useExplorerWidth(
  initial: number,
  min: number,
  max: number,
  storageKey?: string,
) {
  const clamp = useCallback(
    (value: number) => Math.max(min, Math.min(max, value)),
    [max, min],
  );

  const [width, setWidth] = useState(() => {
    if (storageKey != null && typeof window !== 'undefined') {
      try {
        const stored = window.localStorage.getItem(
          `${storageKey}:explorer-width`,
        );
        if (stored != null) {
          const parsed = Number.parseFloat(stored);
          if (Number.isFinite(parsed)) {
            return clamp(parsed);
          }
        }
      } catch {
        // Storage may be unavailable; fall back to the initial width.
      }
    }
    return clamp(initial);
  });

  const dragStateRef = useRef<{ startX: number; startWidth: number } | null>(
    null,
  );

  useEffect(() => {
    if (storageKey == null || typeof window === 'undefined') {
      return;
    }
    try {
      window.localStorage.setItem(
        `${storageKey}:explorer-width`,
        String(width),
      );
    } catch {
      // Persisting the width is best-effort.
    }
  }, [storageKey, width]);

  const onPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return;
      }
      event.preventDefault();
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);
      dragStateRef.current = { startWidth: width, startX: event.clientX };
    },
    [width],
  );

  const onPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const dragState = dragStateRef.current;
      if (dragState == null) {
        return;
      }
      const delta = event.clientX - dragState.startX;
      setWidth(clamp(dragState.startWidth + delta));
    },
    [clamp],
  );

  const endDrag = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (dragStateRef.current == null) {
      return;
    }
    dragStateRef.current = null;
    const handle = event.currentTarget;
    if (handle.hasPointerCapture(event.pointerId)) {
      handle.releasePointerCapture(event.pointerId);
    }
  }, []);

  return { onPointerDown, onPointerMove, onPointerUp: endDrag, width };
}
