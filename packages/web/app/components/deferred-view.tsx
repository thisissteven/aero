import { useEffect, useRef, useState } from 'react';

// Renders fallback / placeholder initially, then mounts heavy child after the
// browser has finished layout + paint work (idle callback) so the virtualizer's
// measureElement gets a stable DOM before it samples heights.
//
// Using requestIdleCallback (with a hard 200 ms timeout) instead of a single
// rAF because one frame is not enough: the browser may still be in the middle
// of layout when rAF fires, causing measureElement to capture wrong heights
// that force a second resize + scroll-anchor correction loop.
const scheduleIdle: (cb: () => void) => () => void =
  typeof requestIdleCallback === 'function'
    ? (cb) => {
        const id = requestIdleCallback(cb, { timeout: 200 });
        return () => cancelIdleCallback(id);
      }
    : // Safari / environments without rIC: fall back to a double-rAF so
      // we at least skip one frame of layout work before mounting heavy content.
      (cb) => {
        let raf2: number;
        const raf1 = requestAnimationFrame(() => {
          raf2 = requestAnimationFrame(cb);
        });
        return () => {
          cancelAnimationFrame(raf1);
          cancelAnimationFrame(raf2);
        };
      };

export function DeferredView({
  children,
  fallback,
}: {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}) {
  const [ready, setReady] = useState(false);
  // Keep cancel ref stable across renders
  const cancelRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    cancelRef.current = scheduleIdle(() => {
      setReady(true);
      cancelRef.current = null;
    });

    return () => {
      cancelRef.current?.();
      cancelRef.current = null;
    };
  }, []);

  if (!ready) {
    return (
      fallback ?? <div className='bg-muted/40 h-16 animate-pulse rounded' />
    );
  }

  return <>{children}</>;
}
