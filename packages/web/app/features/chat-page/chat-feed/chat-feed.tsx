import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useRef,
} from 'react';
import { type VirtualizerHandle } from 'virtua';

import { cn, ScrollShadow, useAutoScroll } from '@aero/ui';

import { ChatConversationView } from '@/app/components/message-view/chat-conversation-view';
import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { useInitialScrollToBottom } from '@/app/features/chat-page/chat-feed/use-initial-scroll-to-bottom';
import { useScrollSubscription } from '@/app/features/chat-page/chat-feed/use-scroll-subscription';
import { useTocScrollTracker } from '@/app/features/chat-page/chat-feed/use-toc-scroll-tracker';
import { useScrollbarWidth } from '@/app/hooks/useScrollbarWidth';
import { AeroConversationTurn } from '@/server/services/harness/types';

export interface ChatFeedRef {
  scrollToIndex: (index: number) => void;
  virtualizerRef: React.RefObject<VirtualizerHandle | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  subscribeScroll: (cb: () => void) => () => void;
}

export const ChatFeed = forwardRef<
  ChatFeedRef,
  {
    revertMessageId?: string;
    groups: AeroConversationTurn[];
    onActiveGroupIndexChange: (index: number) => void;
  }
>(function ChatFeed(
  { revertMessageId, groups, onActiveGroupIndexChange },
  ref,
) {
  const virtualizerRef = useRef<VirtualizerHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollbarWidth = useScrollbarWidth(scrollRef);

  const setConversationData = useChatStore(
    (state) => state.setConversationData,
  );
  const flatItems = useChatStore((state) => state.flatItems);
  const groupFlatIndex = useChatStore((state) => state.groupFlatIndex);

  useEffect(() => {
    setConversationData(groups, revertMessageId);
  }, [groups, revertMessageId, setConversationData]);

  const { subscribeScroll } = useScrollSubscription(scrollRef);

  const isReady = useInitialScrollToBottom(virtualizerRef, flatItems.length);

  const { handleScroll, isProgrammaticScrollRef } = useTocScrollTracker(
    groups,
    groupFlatIndex,
    virtualizerRef,
    onActiveGroupIndexChange,
  );

  useAutoScroll({
    scrollRef,
    contentRef,
    isStreaming: false,
  });

  useImperativeHandle(
    ref,
    () => ({
      virtualizerRef,
      scrollRef,
      subscribeScroll,
      scrollToIndex: (groupIndex: number) => {
        const groupFlatIndexMap = useChatStore.getState().groupFlatIndex;
        const targetFlatIndex = groupFlatIndexMap[groupIndex];
        const handle = virtualizerRef.current;

        if (targetFlatIndex === undefined || !handle) return;

        // Disable scroll tracking feedback loop
        isProgrammaticScrollRef.current = true;
        onActiveGroupIndexChange(groupIndex);

        const currentIndex =
          handle.findItemIndex(scrollRef.current?.scrollTop || 0) ?? 0;
        const indexDistance = Math.abs(targetFlatIndex - currentIndex);

        // If jumping more than 15 items, smooth scroll is slow; jump directly
        const isLongJump = indexDistance > 15;

        handle.scrollToIndex(targetFlatIndex, {
          align: 'start',
          smooth: !isLongJump,
          offset: -40,
        });

        // Re-enable scroll tracker after animation finishes
        setTimeout(
          () => {
            isProgrammaticScrollRef.current = false;
          },
          isLongJump ? 50 : 350,
        );
      },
    }),
    [subscribeScroll, onActiveGroupIndexChange, isProgrammaticScrollRef],
  );

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-1 flex-col transition-opacity duration-150',
        isReady ? 'opacity-100' : 'pointer-events-none opacity-0',
      )}
      style={{ paddingLeft: `${scrollbarWidth}px` }}
    >
      <ScrollShadow
        ref={scrollRef}
        className='min-h-0 flex-1 scrollbar-thin overflow-y-auto md:scrollbar-gutter-stable'
      >
        <div ref={contentRef} className='pb-4'>
          <ChatConversationView
            virtualizerRef={virtualizerRef}
            scrollRef={scrollRef}
            flatItems={flatItems}
            onScroll={handleScroll}
          />
        </div>
      </ScrollShadow>
    </div>
  );
});
