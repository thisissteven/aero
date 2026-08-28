import { useEffect, useLayoutEffect, useRef } from 'react';

interface UseAutoScrollOptions {
  scrollRef: React.RefObject<HTMLElement | null>;
  contentRef: React.RefObject<HTMLElement | null>;
  isStreaming?: boolean;
  threshold?: number;
  enabled?: boolean;
}

export function useAutoScroll({
  scrollRef,
  contentRef,
  isStreaming = false,
  threshold = 100,
  enabled = true,
}: UseAutoScrollOptions) {
  const shouldFollowBottomRef = useRef(false);
  const isStreamingRef = useRef(isStreaming);
  const settlingRef = useRef(false);

  const resizeRafRef = useRef<number | null>(null);
  const streamEndRaf1Ref = useRef<number | null>(null);
  const streamEndRaf2Ref = useRef<number | null>(null);
  const streamEndRaf3Ref = useRef<number | null>(null);

  isStreamingRef.current = isStreaming;

  useEffect(() => {
    if (!enabled) {
      shouldFollowBottomRef.current = false;
      return;
    }

    const scrollEl = scrollRef.current;

    if (!scrollEl) {
      return;
    }

    const isAtBottom = () => {
      const distanceFromBottom =
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;

      return distanceFromBottom <= threshold;
    };

    const handleScroll = () => {
      shouldFollowBottomRef.current = isAtBottom();
    };

    shouldFollowBottomRef.current = isAtBottom();

    scrollEl.addEventListener('scroll', handleScroll, {
      passive: true,
    });

    return () => {
      scrollEl.removeEventListener('scroll', handleScroll);
    };
  }, [enabled, scrollRef, threshold]);

  useLayoutEffect(() => {
    if (!enabled) {
      return;
    }

    const scrollEl = scrollRef.current;
    const contentEl = contentRef.current;

    if (!scrollEl || !contentEl) {
      return;
    }

    const isAtBottom = () => {
      const distanceFromBottom =
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;

      return distanceFromBottom <= threshold;
    };

    const scrollToBottom = () => {
      if (!shouldFollowBottomRef.current) {
        return false;
      }

      scrollEl.scrollTop = scrollEl.scrollHeight + 48;

      return true;
    };

    const scheduleScrollToBottom = () => {
      if (!shouldFollowBottomRef.current) {
        return;
      }

      if (resizeRafRef.current !== null) {
        return;
      }

      resizeRafRef.current = requestAnimationFrame(() => {
        resizeRafRef.current = null;

        if (
          !shouldFollowBottomRef.current ||
          (!isStreamingRef.current && !settlingRef.current)
        ) {
          return;
        }

        scrollToBottom();
      });
    };

    const resizeObserver = new ResizeObserver(() => {
      if (!shouldFollowBottomRef.current) {
        return;
      }

      if (!isStreamingRef.current && !settlingRef.current) {
        return;
      }

      scheduleScrollToBottom();
    });

    resizeObserver.observe(contentEl);

    if (isStreamingRef.current && shouldFollowBottomRef.current) {
      scheduleScrollToBottom();
    }

    return () => {
      resizeObserver.disconnect();

      if (resizeRafRef.current !== null) {
        cancelAnimationFrame(resizeRafRef.current);
        resizeRafRef.current = null;
      }
    };
  }, [enabled, scrollRef, contentRef, threshold]);

  useLayoutEffect(() => {
    if (!enabled || isStreaming) {
      return;
    }

    const scrollEl = scrollRef.current;

    if (!scrollEl) {
      return;
    }

    /**
     * Streaming ended. Only settle if we were actually following
     * the bottom.
     */
    if (!shouldFollowBottomRef.current) {
      settlingRef.current = false;
      return;
    }

    settlingRef.current = true;

    const settle = () => {
      if (!shouldFollowBottomRef.current) {
        settlingRef.current = false;
        return;
      }

      /**
       * If something moved us away from the bottom while settling,
       * stop immediately.
       */
      const distanceFromBottom =
        scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;

      if (distanceFromBottom > threshold) {
        shouldFollowBottomRef.current = false;
        settlingRef.current = false;
        return;
      }

      scrollEl.scrollTop = scrollEl.scrollHeight + 48;
    };

    streamEndRaf1Ref.current = requestAnimationFrame(() => {
      streamEndRaf1Ref.current = null;

      if (!shouldFollowBottomRef.current) {
        settlingRef.current = false;
        return;
      }

      settle();

      streamEndRaf2Ref.current = requestAnimationFrame(() => {
        streamEndRaf2Ref.current = null;

        if (!shouldFollowBottomRef.current) {
          settlingRef.current = false;
          return;
        }

        settle();

        streamEndRaf3Ref.current = requestAnimationFrame(() => {
          streamEndRaf3Ref.current = null;

          if (shouldFollowBottomRef.current) {
            settle();
          }

          settlingRef.current = false;
        });
      });
    });

    return () => {
      if (streamEndRaf1Ref.current !== null) {
        cancelAnimationFrame(streamEndRaf1Ref.current);
        streamEndRaf1Ref.current = null;
      }

      if (streamEndRaf2Ref.current !== null) {
        cancelAnimationFrame(streamEndRaf2Ref.current);
        streamEndRaf2Ref.current = null;
      }

      if (streamEndRaf3Ref.current !== null) {
        cancelAnimationFrame(streamEndRaf3Ref.current);
        streamEndRaf3Ref.current = null;
      }

      settlingRef.current = false;
    };
  }, [enabled, isStreaming, scrollRef, threshold]);
}
