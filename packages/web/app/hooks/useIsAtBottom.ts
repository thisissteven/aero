import type { Virtualizer } from '@tanstack/react-virtual';
import { useEffect, useRef, useState } from 'react';

export function useIsAtBottom(
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  threshold = 100, // Pixels from bottom threshold
) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const rafRef = useRef<number | null>(null);

  // Bind the scroll listener once (only rebinds if the scroll element
  // itself changes), throttled to one check per frame.
  useEffect(() => {
    const scrollElement = virtualizer.scrollElement;
    if (!scrollElement) return;

    const checkScroll = () => {
      const scrollBottom = scrollElement.scrollTop + scrollElement.clientHeight;
      const totalHeight = virtualizer.getTotalSize();
      const atBottom = totalHeight - scrollBottom <= threshold;

      setIsAtBottom((prev) => (prev === atBottom ? prev : atBottom));
    };

    const onScroll = () => {
      if (rafRef.current !== null) return;
      rafRef.current = requestAnimationFrame(() => {
        rafRef.current = null;
        checkScroll();
      });
    };

    checkScroll();

    scrollElement.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scrollElement.removeEventListener('scroll', onScroll);
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [virtualizer, virtualizer.scrollElement, threshold]);

  // Re-check without rebinding the listener whenever content height
  // changes (e.g. a message finishes rendering and the list grows).
  const totalSize = virtualizer.getTotalSize();

  useEffect(() => {
    const scrollElement = virtualizer.scrollElement;
    if (!scrollElement) return;

    const scrollBottom = scrollElement.scrollTop + scrollElement.clientHeight;
    const atBottom = totalSize - scrollBottom <= threshold;

    setIsAtBottom((prev) => (prev === atBottom ? prev : atBottom));
  }, [totalSize, threshold, virtualizer]);

  return isAtBottom;
}
