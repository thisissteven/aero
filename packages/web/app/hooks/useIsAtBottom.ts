import type { Virtualizer } from '@tanstack/react-virtual';
import { useEffect, useState } from 'react';

export function useIsAtBottom(
  virtualizer: Virtualizer<HTMLDivElement, Element>,
  threshold = 100, // Pixels from bottom threshold
) {
  const [isAtBottom, setIsAtBottom] = useState(true);

  useEffect(() => {
    const scrollElement = virtualizer.scrollElement;
    if (!scrollElement) return;

    const checkScroll = () => {
      const scrollBottom = scrollElement.scrollTop + scrollElement.clientHeight;
      const totalHeight = virtualizer.getTotalSize();

      // Check if distance to bottom is within threshold
      const atBottom = totalHeight - scrollBottom <= threshold;
      setIsAtBottom(atBottom);
    };

    // Run initial check
    checkScroll();

    // Attach passive listener to the virtualizer's container element
    scrollElement.addEventListener('scroll', checkScroll, { passive: true });
    return () => scrollElement.removeEventListener('scroll', checkScroll);
  }, [virtualizer, virtualizer.scrollElement, virtualizer.getTotalSize()]);

  return isAtBottom;
}
