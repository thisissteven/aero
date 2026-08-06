// hooks/useThrottledCallback.ts
import { useCallback, useEffect, useRef } from 'react';

/**
 * Custom hook to throttle a function execution in React.
 * Guarantees leading execution and ensures trailing execution so final state changes aren't missed.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number,
): (...args: Parameters<T>) => void {
  const callbackRef = useRef(callback);
  const lastRanRef = useRef<number>(0);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep the callback ref updated to prevent stale closures
  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      const now = Date.now();
      const timeSinceLastRun = now - lastRanRef.current;

      if (timeSinceLastRun >= delay) {
        // Run immediately if enough time has passed (Leading execution)
        if (timeoutRef.current) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        lastRanRef.current = now;
        callbackRef.current(...args);
      } else if (!timeoutRef.current) {
        // Schedule a trailing execution to capture the last event (e.g., end of scroll)
        timeoutRef.current = setTimeout(() => {
          lastRanRef.current = Date.now();
          timeoutRef.current = null;
          callbackRef.current(...args);
        }, delay - timeSinceLastRun);
      }
    },
    [delay],
  );
}
