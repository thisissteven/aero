/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useState } from 'react';

function scheduleWhenStable(cb: () => void) {
  let idleId: number | undefined;
  let scrollTimer: number | undefined;
  let cancelled = false;

  const cleanup = () => {
    if (idleId !== undefined) {
      cancelIdleCallback(idleId);
    }

    if (scrollTimer !== undefined) {
      clearTimeout(scrollTimer);
    }

    window.removeEventListener('scroll', onScroll, true);
  };

  const run = () => {
    if (cancelled) return;

    // Avoid mounting while browser reports pending input
    if (
      'scheduler' in window &&
      'isInputPending' in (navigator as any).scheduling &&
      (navigator as any).scheduling.isInputPending()
    ) {
      idleId = requestIdleCallback(run, { timeout: 500 });
      return;
    }

    cb();
    cleanup();
  };

  const onScroll = () => {
    if (cancelled) return;

    if (idleId !== undefined) {
      cancelIdleCallback(idleId);
      idleId = undefined;
    }

    clearTimeout(scrollTimer);

    // wait until scrolling stops
    scrollTimer = window.setTimeout(() => {
      idleId = requestIdleCallback(run, {
        timeout: 100,
      });
    }, 50);
  };

  window.addEventListener('scroll', onScroll, true);

  idleId = requestIdleCallback(run, {
    timeout: 100,
  });

  return () => {
    cancelled = true;
    cleanup();
  };
}

export function DeferredView({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const cancel = scheduleWhenStable(() => {
      setReady(true);
    });

    return cancel;
  }, []);

  if (!ready) {
    return null;
  }

  return <>{children}</>;
}
