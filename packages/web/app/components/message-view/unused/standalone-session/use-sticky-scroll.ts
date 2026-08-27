// app/hooks/useStickyScroll.ts
import { useCallback, useEffect, useRef } from 'react';

const BOTTOM_THRESHOLD_PX = 48;

export function useStickyScroll<T extends HTMLElement>(deps: unknown[]) {
  const containerRef = useRef<T>(null);
  const autoScrollRef = useRef(true);

  const isNearBottom = useCallback((el: HTMLElement) => {
    return (
      el.scrollHeight - el.scrollTop - el.clientHeight < BOTTOM_THRESHOLD_PX
    );
  }, []);

  const scrollToBottom = useCallback((behavior: ScrollBehavior = 'auto') => {
    containerRef.current?.scrollTo({
      top: containerRef.current.scrollHeight,
      behavior,
    });
  }, []);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onScroll = () => {
      autoScrollRef.current = isNearBottom(el);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [isNearBottom]);

  // Initial mount: snap to bottom.
  useEffect(() => {
    scrollToBottom('auto');
  }, []);

  // New content: only follow if user hasn't scrolled away from bottom.
  useEffect(() => {
    if (autoScrollRef.current) scrollToBottom('smooth');
  }, deps);

  return { containerRef, scrollToBottom };
}
