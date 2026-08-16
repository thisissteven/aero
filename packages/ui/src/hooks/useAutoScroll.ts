import { useEffect, useLayoutEffect, useRef } from 'react';

interface UseAutoScrollOptions {
  scrollRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLElement | null>;
  isStreaming?: boolean;
  threshold?: number;
}

export function useAutoScroll({
  scrollRef,
  contentRef,
  isStreaming = false,
  threshold = 100,
}: UseAutoScrollOptions) {
  const userIsAtBottomRef = useRef(true);
  const lastScrollTopRef = useRef(0);
  const isAutoScrollingRef = useRef(false);

  // 1. Scroll listener — active only while streaming or when user resets position
  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl || !isStreaming) return;

    const handleScroll = () => {
      if (isAutoScrollingRef.current) return;

      const currentScrollTop = scrollEl.scrollTop;
      const lastScrollTop = lastScrollTopRef.current;
      lastScrollTopRef.current = currentScrollTop;

      const distanceFromBottom =
        scrollEl.scrollHeight - currentScrollTop - scrollEl.clientHeight;

      if (currentScrollTop < lastScrollTop && distanceFromBottom > threshold) {
        userIsAtBottomRef.current = false;
      } else if (distanceFromBottom <= threshold) {
        userIsAtBottomRef.current = true;
      }
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, [scrollRef, isStreaming, threshold]);

  // 2. ResizeObserver — active only while streaming
  useLayoutEffect(() => {
    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;
    if (!scrollEl || !contentEl || !isStreaming) return;

    const scrollToBottom = () => {
      if (!userIsAtBottomRef.current) return;

      isAutoScrollingRef.current = true;
      scrollEl.scrollTop = scrollEl.scrollHeight;
      lastScrollTopRef.current = scrollEl.scrollTop;

      requestAnimationFrame(() => {
        isAutoScrollingRef.current = false;
      });
    };

    scrollToBottom();

    const resizeObserver = new ResizeObserver(() => {
      scrollToBottom();
    });

    resizeObserver.observe(contentEl);

    return () => resizeObserver.disconnect();
  }, [scrollRef, contentRef, isStreaming]);
}
