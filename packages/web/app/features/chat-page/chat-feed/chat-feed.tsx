// chat-feed.tsx

import { useParams } from '@tanstack/react-router';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { type VirtualizerHandle } from 'virtua';

import { cn, ScrollShadow, useAutoScroll } from '@aero/ui';

import { ChatConversationView } from '@/app/components/message-view/chat-conversation-view';
import {
  getSessionStore,
  useChatStore,
} from '@/app/components/message-view/unused/streaming-demo/streaming-demo-store';
import { useInitialScrollToBottom } from '@/app/features/chat-page/chat-feed/use-initial-scroll-to-bottom';
import { useScrollSubscription } from '@/app/features/chat-page/chat-feed/use-scroll-subscription';
import { useTocScrollTracker } from '@/app/features/chat-page/chat-feed/use-toc-scroll-tracker';
import { useScrollbarWidth } from '@/app/hooks/useScrollbarWidth';
import type { AeroConversationTurn } from '@/server/services/harness/types';

export interface ChatFeedRef {
  scrollToIndex: (index: number) => void;
  virtualizerRef: React.RefObject<VirtualizerHandle | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  subscribeScroll: (cb: () => void) => () => void;
}

export const ChatFeed = forwardRef<
  ChatFeedRef,
  {
    groups: AeroConversationTurn[];
    onActiveGroupIndexChange: (index: number) => void;
  }
>(function ChatFeed({ groups, onActiveGroupIndexChange }, ref) {
  const virtualizerRef = useRef<VirtualizerHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  const scrollbarWidth = useScrollbarWidth(scrollRef);

  const { sessionId } = useParams({ strict: false });

  const chatStore = getSessionStore(sessionId);
  const flatItems = useChatStore(sessionId, (state) => state.flatItems);
  const groupFlatIndex = useChatStore(
    sessionId,
    (state) => state.groupFlatIndex,
  );
  const isStreaming = useChatStore(sessionId, (state) => state.isStreaming);

  const { subscribeScroll } = useScrollSubscription(scrollRef);

  const isReady = useInitialScrollToBottom(virtualizerRef, flatItems.length);

  const { handleScroll, beginProgrammaticScroll, endProgrammaticScroll } =
    useTocScrollTracker(
      groups,
      groupFlatIndex,
      virtualizerRef,
      onActiveGroupIndexChange,
    );

  useAutoScroll({
    scrollRef,
    contentRef,
    isStreaming,
    enabled: isReady,
  });

  useImperativeHandle(
    ref,
    () => ({
      virtualizerRef,
      scrollRef,
      subscribeScroll,

      scrollToIndex: (groupIndex: number) => {
        const targetFlatIndex = chatStore.getState().groupFlatIndex[groupIndex];

        const handle = virtualizerRef.current;

        if (targetFlatIndex === undefined || !handle) {
          return;
        }

        onActiveGroupIndexChange(groupIndex);

        beginProgrammaticScroll();

        handle.scrollToIndex(targetFlatIndex, {
          align: 'start',
          smooth: false,
          offset: -24,
        });

        requestAnimationFrame(() => {
          endProgrammaticScroll();
        });
      },
    }),
    [
      beginProgrammaticScroll,
      endProgrammaticScroll,
      onActiveGroupIndexChange,
      subscribeScroll,
    ],
  );

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-1 flex-col transition-opacity duration-150',
        !isReady && groups.length > 0
          ? 'pointer-events-none opacity-0'
          : 'opacity-100',
      )}
      style={{
        paddingLeft: `${scrollbarWidth}px`,
      }}
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
