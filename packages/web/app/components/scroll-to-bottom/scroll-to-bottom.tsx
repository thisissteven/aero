import type { RefObject } from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';

import { Button, cn, IconChevronDown, Tooltip } from '@aero/ui';

import { useScrollToBottom } from '@/app/components/scroll-to-bottom/use-scroll-to-bottom';

interface ScrollToBottomButtonProps {
  scrollRef: RefObject<HTMLElement | null>;
  subscribeScroll: (cb: () => void) => () => void;
  tooltip?: string;
}

export const ScrollToBottomButton = memo(function ScrollToBottomButton({
  scrollRef,
  subscribeScroll,
  tooltip,
}: ScrollToBottomButtonProps) {
  const [isReady, setIsReady] = useState(false);
  const [isAtBottom, setIsAtBottom] = useState(true);
  const [showButton, setShowButton] = useState(false);

  const showButtonTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const scrollToBottom = useScrollToBottom();

  const threshold = 100;

  const clearShowButtonTimeout = useCallback(() => {
    if (showButtonTimeoutRef.current !== null) {
      clearTimeout(showButtonTimeoutRef.current);
      showButtonTimeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    const timeout = setTimeout(() => setIsReady(true), 1000);

    return () => clearTimeout(timeout);
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
      // Cancel immediately, before React gets another render.
      clearShowButtonTimeout();
      setShowButton(false);
    }

    setIsAtBottom(atBottom);
  }, [scrollRef, clearShowButtonTimeout]);

  useEffect(() => {
    checkIsAtBottom();

    return subscribeScroll(checkIsAtBottom);
  }, [subscribeScroll, checkIsAtBottom]);

  useEffect(() => {
    if (isAtBottom) {
      clearShowButtonTimeout();
      return;
    }

    // Don't create another timer if one is already pending.
    if (showButtonTimeoutRef.current !== null) {
      return;
    }

    showButtonTimeoutRef.current = setTimeout(() => {
      showButtonTimeoutRef.current = null;

      // Check the actual DOM position again before showing.
      const scrollEl = scrollRef.current;

      if (!scrollEl) return;

      const distanceToBottom =
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;

      if (distanceToBottom > threshold) {
        setShowButton(true);
      }
    }, 300);

    return clearShowButtonTimeout;
  }, [isAtBottom, scrollRef, clearShowButtonTimeout]);

  useEffect(() => {
    return clearShowButtonTimeout;
  }, [clearShowButtonTimeout]);

  if (!showButton) return null;

  const buttonElement = (
    <Button
      isIconOnly
      size='sm'
      variant='secondary'
      aria-label='Scroll to bottom'
      className={cn(
        'pointer-events-auto shadow-md',
        'animate-in fade-in-0 slide-in-from-bottom-2 duration-200',
        isReady ? 'opacity-100' : 'opacity-0',
        'bg-surface/60 hover:bg-default/60 active:bg-default/60 backdrop-blur-sm',
      )}
      onPress={scrollToBottom}
    >
      <IconChevronDown className='text-foreground size-4' />
    </Button>
  );

  return tooltip ? (
    <Tooltip>
      <Tooltip.Trigger>{buttonElement}</Tooltip.Trigger>
      <Tooltip.Content>{tooltip}</Tooltip.Content>
    </Tooltip>
  ) : (
    buttonElement
  );
});
