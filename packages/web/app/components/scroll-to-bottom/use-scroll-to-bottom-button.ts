import { RefObject, useCallback, useEffect, useState } from 'react';

import { useScrollToBottom } from '@/app/components/scroll-to-bottom/use-scroll-to-bottom';

interface UseScrollToBottomButtonProps {
  scrollRef: RefObject<HTMLElement | null>;
  subscribeScroll: (callback: () => void) => () => void;
  threshold?: number;
}

export function useScrollToBottomButton({
  scrollRef,
  subscribeScroll,
  threshold = 100,
}: UseScrollToBottomButtonProps) {
  const [showButton, setShowButton] = useState(false);
  const scrollToBottom = useScrollToBottom();

  const checkIsAtBottom = useCallback(() => {
    const scrollEl = scrollRef.current;

    if (!scrollEl) {
      setShowButton(false);
      return;
    }

    const distanceToBottom =
      scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;

    // Show button immediately when user scrolls past threshold
    setShowButton(distanceToBottom > threshold);
  }, [scrollRef, threshold]);

  useEffect(() => {
    checkIsAtBottom();

    return subscribeScroll(checkIsAtBottom);
  }, [subscribeScroll, checkIsAtBottom]);

  return {
    showButton,
    scrollToBottom,
  };
}
