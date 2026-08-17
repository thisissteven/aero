import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Virtualizer, type VirtualizerHandle } from 'virtua';

import { cn, ScrollShadow } from '@aero/ui';

import { MessageView } from '@/app/components/message-view/unused/message-view';
import { ChatSession } from '@/app/data/chat';
import { useScrollbarWidth } from '@/app/hooks/useScrollbarWidth';
import { AeroConversationTurn } from '@/server/services/harness/types';

export interface VirtualizedChatFeedRef {
  scrollToIndex: (index: number) => void;
  virtualizerRef: React.RefObject<VirtualizerHandle | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Subscribe to scroll ticks without causing a parent re-render. Returns an unsubscribe fn. */
  subscribeScroll: (cb: () => void) => () => void;
}

export const VirtualizedChatFeed = React.memo(
  React.forwardRef<
    VirtualizedChatFeedRef,
    {
      groups: ChatSession['turns'];
      onActiveGroupIndexChange: (index: number) => void;
    }
  >(function VirtualizedChatFeed({ groups, onActiveGroupIndexChange }, ref) {
    const virtualizerRef = useRef<VirtualizerHandle>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const [ready, setReady] = useState(false);
    const didInitialScroll = useRef(false);

    useLayoutEffect(() => {
      if (didInitialScroll.current) return;
      if (!groups.length) return;

      const virtualizer = virtualizerRef.current;
      if (!virtualizer) return;

      // wait one frame so virtua has mounted/measured
      const raf = requestAnimationFrame(() => {
        virtualizer.scrollToIndex(groups.length - 1, {
          align: 'end',
        });

        didInitialScroll.current = true;

        // reveal after scroll has been applied
        requestAnimationFrame(() => {
          setReady(true);
        });
      });

      return () => cancelAnimationFrame(raf);
    }, [groups.length]);

    const scrollRafRef = useRef<number | null>(null);
    const isProgrammaticScrollRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const scrollListenersRef = useRef(new Set<() => void>());

    // Sorted ascending by construction (groups are in order) -> binary search instead of O(n) scan.
    const userGroupIndexes = useMemo(
      () =>
        groups.reduce<number[]>((acc, group, index) => {
          if (group.role === 'user') acc.push(index);
          return acc;
        }, []),
      [groups],
    );

    const resolveActiveIndex = useCallback(
      (index: number) => {
        const arr = userGroupIndexes;
        if (arr.length === 0) return 0;
        let lo = 0;
        let hi = arr.length - 1;
        let result = arr[0]!;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const val = arr[mid]!;
          if (val <= index) {
            result = val;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
        return result;
      },
      [userGroupIndexes],
    );

    const resolveActiveIndexRef = useRef(resolveActiveIndex);
    useEffect(() => {
      resolveActiveIndexRef.current = resolveActiveIndex;
    }, [resolveActiveIndex]);

    const handleScroll = useCallback(
      (offset: number) => {
        // Cheap: just ping listeners (e.g. the scroll-to-bottom button). No React state, no re-render here.
        scrollListenersRef.current.forEach((cb) => cb());

        if (isProgrammaticScrollRef.current) return;

        if (scrollRafRef.current !== null) return;
        scrollRafRef.current = requestAnimationFrame(() => {
          scrollRafRef.current = null;
          const handle = virtualizerRef.current;
          if (!handle) return;

          const startIndex = handle.findItemIndex(offset + 60);
          if (startIndex != null && startIndex >= 0) {
            onActiveGroupIndexChange(resolveActiveIndexRef.current(startIndex));
          }
        });
      },
      [onActiveGroupIndexChange],
    );

    useEffect(() => {
      return () => {
        if (scrollRafRef.current !== null) {
          cancelAnimationFrame(scrollRafRef.current);
        }
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, []);

    const scrollbarWidth = useScrollbarWidth(scrollRef);

    return (
      <div
        className={cn(
          'relative flex min-h-0 flex-1 flex-col transition',
          ready ? 'opacity-100' : 'opacity-0',
        )}
        style={{ paddingLeft: `${scrollbarWidth}px` }}
      >
        <ScrollShadow
          ref={scrollRef}
          className='min-h-0 flex-1 scrollbar-thin scrollbar-gutter-stable overflow-y-auto pt-10'
        >
          <Virtualizer<AeroConversationTurn>
            ref={virtualizerRef}
            scrollRef={scrollRef}
            data={groups}
            shift={true}
            onScroll={handleScroll}
          >
            {(turn) => {
              return (
                <div
                  key={turn.id}
                  className='mx-auto w-full px-3 pb-8 md:max-w-[720px]'
                >
                  <MessageView turn={turn} isStreaming={false} />
                </div>
              );
            }}
          </Virtualizer>
        </ScrollShadow>
      </div>
    );
  }),
);
