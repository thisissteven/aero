import { useCallback, useEffect, useRef } from 'react';

export function useScrollSubscription(
  scrollRef: React.RefObject<HTMLDivElement | null>,
) {
  const listenersRef = useRef(new Set<() => void>());

  const subscribeScroll = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);

    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  const notifyScroll = useCallback(() => {
    for (const listener of listenersRef.current) {
      listener();
    }
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;

    if (!scrollEl) {
      return;
    }

    scrollEl.addEventListener('scroll', notifyScroll, {
      passive: true,
    });

    return () => {
      scrollEl.removeEventListener('scroll', notifyScroll);
    };
  }, [scrollRef, notifyScroll]);

  return {
    subscribeScroll,
    notifyScroll,
  };
}
