// scroll-to-bottom-button.tsx
import type { RefObject } from 'react';
import { memo, useCallback, useEffect, useState } from 'react';

import { Button, cn, IconChevronDown, Tooltip } from '@aero/ui';

interface ScrollToBottomButtonProps {
  scrollRef: RefObject<HTMLElement | null>;
  subscribeScroll: (cb: () => void) => () => void;
  tooltip?: string;
  onClick?: () => void;
}

export const ScrollToBottomButton = memo(function ScrollToBottomButton({
  scrollRef,
  subscribeScroll,
  tooltip,
  onClick,
}: ScrollToBottomButtonProps) {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(() => setIsReady(true), 1000);

    return () => clearTimeout(timeout);
  }, []);

  const [isAtBottom, setIsAtBottom] = useState(true);
  const threshold = 100;

  const checkIsAtBottom = useCallback(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) {
      setIsAtBottom(true);
      return;
    }
    const distanceToBottom =
      scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;
    setIsAtBottom(distanceToBottom <= threshold);
  }, [scrollRef]);

  useEffect(() => {
    checkIsAtBottom();
    return subscribeScroll(checkIsAtBottom);
  }, [subscribeScroll, checkIsAtBottom]);

  useEffect(() => {
    checkIsAtBottom();
  }, [checkIsAtBottom]);

  // isAtBottom updates are already cheap (Object.is bail-out) and now correct;
  // deferring is unnecessary and was masking/staling the value during
  // continuous streaming renders. Drop it.
  if (isAtBottom) return null;

  const handleScrollToBottom = () => {
    if (onClick) {
      onClick();
      return;
    }
    const el = scrollRef.current;
    if (!el) return;
    const distance = el.scrollHeight - el.scrollTop - el.clientHeight;
    el.scrollTo({
      top: el.scrollHeight,
      behavior: distance < 2000 ? 'smooth' : 'auto',
    });
  };

  const buttonElement = (
    <Button
      isIconOnly
      size='sm'
      variant='secondary'
      aria-label='Scroll to bottom'
      className={cn(
        'pointer-events-auto shadow-md transition-all duration-200',
        isReady ? 'opacity-100' : 'opacity-0',
      )}
      onPress={handleScrollToBottom}
    >
      <IconChevronDown className='text-foreground size-4' />
    </Button>
  );

  return tooltip ? (
    <Tooltip delay={0}>
      <Tooltip.Trigger>{buttonElement}</Tooltip.Trigger>
      <Tooltip.Content>{tooltip}</Tooltip.Content>
    </Tooltip>
  ) : (
    buttonElement
  );
});
