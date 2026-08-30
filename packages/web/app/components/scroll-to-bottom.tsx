// scroll-to-bottom-button.tsx
import type { RefObject } from 'react';
import { memo, useCallback, useEffect, useState } from 'react';
import { create } from 'zustand';

import { Button, cn, IconChevronDown, Tooltip } from '@aero/ui';

interface ScrollControllerState {
  scrollRef: RefObject<HTMLElement | null> | null;
  setScrollRef: (ref: RefObject<HTMLElement | null>) => void;
  scrollToBottom: () => void;
}

export const useScrollController = create<ScrollControllerState>(
  (set, get) => ({
    scrollRef: null,

    setScrollRef: (ref) => {
      set({ scrollRef: ref });
    },

    scrollToBottom: () => {
      const el = get().scrollRef?.current;
      if (!el) return;

      const distance = el.scrollHeight - el.scrollTop - el.clientHeight;

      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          el.scrollTo({
            top: el.scrollHeight,
            behavior: distance < 2000 ? 'smooth' : 'auto',
          });
        });
      });
    },
  }),
);

export function useScrollToBottom() {
  return useScrollController((state) => state.scrollToBottom);
}

export function useRegisterScrollContainer(
  scrollRef: RefObject<HTMLDivElement | null> | null,
) {
  useEffect(() => {
    if (scrollRef) {
      useScrollController.getState().setScrollRef(scrollRef);
    }

    return () => {
      useScrollController.setState({ scrollRef: null });
    };
  }, [scrollRef]);
}
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

  const scrollToBottom = useScrollToBottom();

  const threshold = 100;

  useEffect(() => {
    const timeout = setTimeout(() => setIsReady(true), 1000);

    return () => clearTimeout(timeout);
  }, []);

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

  if (isAtBottom) return null;

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
      onPress={scrollToBottom}
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
