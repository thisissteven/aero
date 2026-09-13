import { RefObject, useCallback, useEffect, useRef, useState } from 'react';

import { useScrollToBottom } from '@/app/components/scroll-to-bottom/use-scroll-to-bottom';

interface UseScrollToBottomButtonProps {
  scrollRef: RefObject<HTMLElement | null>;
  subscribeScroll: (callback: () => void) => () => void;
  threshold?: number;
  type: 'main' | 'side';
}

export function useScrollToBottomButton({
  scrollRef,
  subscribeScroll,
  threshold = 100,
  type,
}: UseScrollToBottomButtonProps) {
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showButton, setShowButton] = useState(false);

  const showButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const scrollToBottom = useScrollToBottom(type);

  const clearShowButtonTimeout = useCallback(() => {
    if (showButtonTimeoutRef.current !== null) {
      clearTimeout(showButtonTimeoutRef.current);
      showButtonTimeoutRef.current = null;
    }
  }, []);

  const checkIsAtBottom = useCallback(() => {
    const scrollEl = scrollRef.current;

    if (!scrollEl) {
      clearShowButtonTimeout();
      setIsAtBottom(true);
      setShowButton(false);
      return;
    }

    const distanceToBottom =
      scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;

    const atBottom = distanceToBottom <= threshold;

    if (atBottom) {
      clearShowButtonTimeout();
      setShowButton(false);
    }

    setIsAtBottom(atBottom);
  }, [scrollRef, threshold, clearShowButtonTimeout]);

  useEffect(() => {
    checkIsAtBottom();

    return subscribeScroll(checkIsAtBottom);
  }, [subscribeScroll, checkIsAtBottom]);

  useEffect(() => {
    if (isAtBottom) {
      clearShowButtonTimeout();
      return;
    }

    if (showButtonTimeoutRef.current !== null) {
      return;
    }

    showButtonTimeoutRef.current = setTimeout(() => {
      showButtonTimeoutRef.current = null;

      const scrollEl = scrollRef.current;

      if (!scrollEl) return;

      const distanceToBottom =
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;

      if (distanceToBottom > threshold) {
        setShowButton(true);
      }
    }, 300);

    return clearShowButtonTimeout;
  }, [isAtBottom, scrollRef, threshold, clearShowButtonTimeout]);

  useEffect(() => {
    return clearShowButtonTimeout;
  }, [clearShowButtonTimeout]);

  return {
    showButton,
    scrollToBottom,
  };
}
