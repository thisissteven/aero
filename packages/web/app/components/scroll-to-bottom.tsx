// scroll-to-bottom-button.tsx
import type { RefObject } from 'react';
import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useState,
} from 'react';
import type { VirtualizerHandle } from 'virtua';

import { Button, IconChevronDown, Tooltip } from '@aero/ui';

interface ScrollToBottomButtonProps {
  virtualizerRef: RefObject<VirtualizerHandle | null>;
  /** Subscribe to scroll ticks from the feed; returns an unsubscribe fn. */
  subscribeScroll: (cb: () => void) => () => void;
  totalCount: number;
  tooltip?: string;
  onClick?: () => void;
}

export const ScrollToBottomButton = memo(function ScrollToBottomButton({
  virtualizerRef,
  subscribeScroll,
  totalCount,
  tooltip,
  onClick,
}: ScrollToBottomButtonProps) {
  const [isAtBottom, setIsAtBottom] = useState(true);

  const checkIsAtBottom = useCallback(() => {
    const handle = virtualizerRef.current;
    if (!handle) return;

    const threshold = 28; // px tolerance from bottom
    const distanceToBottom =
      handle.scrollSize - (handle.scrollOffset + handle.viewportSize);

    // setState bails out on identical value (Object.is), so this is cheap even
    // when called every scroll frame.
    setIsAtBottom(distanceToBottom <= threshold);
  }, [virtualizerRef]);

  // Re-check on scroll (subscription-based: only THIS component re-renders, not the whole page)
  useEffect(() => {
    checkIsAtBottom();
    return subscribeScroll(checkIsAtBottom);
  }, [subscribeScroll, checkIsAtBottom]);

  // Re-check when message count changes (e.g. new message lands while at/near bottom)
  useEffect(() => {
    checkIsAtBottom();
  }, [totalCount, checkIsAtBottom]);

  const deferred = useDeferredValue(isAtBottom);

  if (deferred) return null;

  const handleScrollToBottom = () => {
    if (onClick) {
      onClick();
      return;
    }

    const handle = virtualizerRef.current;
    if (!handle || totalCount === 0) return;

    const lastIndex = totalCount - 1;
    const currentBottomIndex = handle.findItemIndex(
      handle.scrollOffset + handle.viewportSize,
    );

    const isClose = lastIndex - currentBottomIndex < 5;

    handle.scrollToIndex(lastIndex, {
      align: 'end',
      smooth: isClose,
    });
  };

  const buttonElement = (
    <Button
      isIconOnly
      size='sm'
      variant='secondary'
      aria-label='Scroll to bottom'
      className='pointer-events-auto shadow-md transition-all duration-200'
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
