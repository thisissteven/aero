import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { Virtualizer, type VirtualizerHandle } from 'virtua';

import { cn, ScrollShadow } from '@aero/ui';

import { MessageView } from '@/app/components/message-view';
import { useScrollbarWidth } from '@/app/hooks/useScrollbarWidth';
import { AeroConversationTurn } from '@/server/services/harness/types';

import { useMockStreamFeed } from './useMockStreamFeed';

export function MockChatPage({
  mockGroups,
}: {
  mockGroups: AeroConversationTurn[];
}) {
  const virtualizerRef = useRef<VirtualizerHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [ready, setReady] = useState(false);
  const didInitialScroll = useRef(false);
  const userScrolledUpRef = useRef(false);

  // 1. Hook drives streamed updates into displayedGroups
  const { displayedGroups, isStreaming } = useMockStreamFeed(mockGroups, true);

  const scrollbarWidth = useScrollbarWidth(scrollRef);

  // 2. Initial scroll to bottom on mount
  useLayoutEffect(() => {
    if (didInitialScroll.current || !displayedGroups.length) return;

    const virtualizer = virtualizerRef.current;
    if (!virtualizer) return;

    const raf = requestAnimationFrame(() => {
      virtualizer.scrollToIndex(displayedGroups.length - 1, {
        align: 'end',
      });

      didInitialScroll.current = true;

      requestAnimationFrame(() => {
        setReady(true);
      });
    });

    return () => cancelAnimationFrame(raf);
  }, [displayedGroups.length]);

  // 3. Track manual user scrolling to un-stick auto-scroll if user scrolls up
  const handleScroll = useCallback((offset: number) => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const distanceFromBottom =
      scrollEl.scrollHeight - scrollEl.scrollTop - scrollEl.clientHeight;

    // If user scrolled up more than 80px, pause automatic scroll tracking
    userScrolledUpRef.current = distanceFromBottom > 80;
  }, []);

  // 4. Reset user scroll override when a new stream cycle begins
  useEffect(() => {
    if (isStreaming) {
      userScrolledUpRef.current = false;
    }
  }, [isStreaming]);

  // 5. Auto-scroll to bottom as chunks arrive
  useEffect(() => {
    if (!displayedGroups.length) return;

    if (!userScrolledUpRef.current) {
      virtualizerRef.current?.scrollToIndex(displayedGroups.length - 1, {
        align: 'end',
      });
    }
  }, [displayedGroups]);

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
          data={displayedGroups}
          shift={true}
          onScroll={handleScroll}
        >
          {(turn, index) => {
            // Determine if this specific turn is currently streaming
            const isLastTurn = index === displayedGroups.length - 1;
            const isTurnStreaming = isStreaming && isLastTurn;

            return (
              <div
                key={turn.id}
                className='mx-auto w-full px-3 pb-8 md:max-w-[720px]'
              >
                <MessageView turn={turn} isStreaming={isTurnStreaming} />
              </div>
            );
          }}
        </Virtualizer>
      </ScrollShadow>
    </div>
  );
}
