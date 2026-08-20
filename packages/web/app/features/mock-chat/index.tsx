import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type VirtualizerHandle } from 'virtua';

import { cn, ScrollShadow } from '@aero/ui';
import { useAutoScroll } from '@aero/ui/hooks';

import { ChatConversationView } from '@/app/components/message-view/chat-conversation-view';
import { buildFlatConversationItems } from '@/app/components/message-view/lib';
import { useScrollbarWidth } from '@/app/hooks/useScrollbarWidth';
import { AeroConversationTurn } from '@/server/services/harness/types';

import { useMockStreamFeed } from './useMockStreamFeed';

export interface MockChatPageRef {
  scrollToIndex: (index: number) => void;
  virtualizerRef: React.RefObject<VirtualizerHandle | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  /** Subscribe to scroll ticks without causing a parent re-render. Returns an unsubscribe fn. */
  subscribeScroll: (cb: () => void) => () => void;
}

export const MockChatPage = forwardRef<
  MockChatPageRef,
  { mockGroups: AeroConversationTurn[] }
>(function MockChatPage({ mockGroups }, ref) {
  const virtualizerRef = useRef<VirtualizerHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const listenersRef = useRef<Set<() => void>>(new Set());

  const [ready, setReady] = useState(false);

  // 1. Stream feed hook
  const { displayedGroups, isStreaming } = useMockStreamFeed(mockGroups, true);

  const { flatItems, groupFlatIndex } = useMemo(
    () => buildFlatConversationItems(displayedGroups, isStreaming),
    [displayedGroups, isStreaming],
  );

  const scrollbarWidth = useScrollbarWidth(scrollRef);

  // 2. Drive auto-scrolling via hook
  useAutoScroll({
    scrollRef,
    contentRef,
    isStreaming,
  });

  // 3. Scroll event subscription for ScrollToBottomButton
  const subscribeScroll = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      listenersRef.current.forEach((cb) => cb());
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  // 4. Expose ref interface to parent
  useImperativeHandle(
    ref,
    () => ({
      virtualizerRef,
      scrollRef,
      subscribeScroll,
      scrollToIndex: (groupIndex: number) => {
        const flatIndex = groupFlatIndex[groupIndex];
        if (flatIndex === undefined) return;
        virtualizerRef.current?.scrollToIndex(flatIndex, {
          align: 'start', // jump so the target bubble lands near the top
          smooth: true,
        });
      },
    }),
    [subscribeScroll, groupFlatIndex],
  );

  useLayoutEffect(() => {
    if (displayedGroups.length && !ready) {
      setReady(true);
    }
  }, [displayedGroups.length, ready]);

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
        className='min-h-0 flex-1 scrollbar-thin overflow-y-auto md:scrollbar-gutter-stable'
      >
        <div ref={contentRef} className='pb-4'>
          <ChatConversationView
            flatItems={flatItems}
            onScroll={() => {}}
            scrollRef={scrollRef}
            virtualizerRef={virtualizerRef}
          />
        </div>
      </ScrollShadow>
    </div>
  );
});
