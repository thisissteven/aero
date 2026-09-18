// chat-feed.tsx

import { cn, ScrollShadow } from '@aero/ui';
import React, { forwardRef, useImperativeHandle, useRef } from 'react';
import { type VirtualizerHandle } from 'virtua';

import { ChatConversationView } from '@/app/components/message-view/chat-conversation-view';
import { SelectionPopover } from '@/app/components/selection-popover';
import { useSessionRuntime } from '@/app/features/chat-page/chat-feed/chat-store';
import { ReplyToPermission } from '@/app/features/chat-page/chat-feed/reply-to-permission';
import { ReplyToQuestion } from '@/app/features/chat-page/chat-feed/reply-to-question';
import { RevertedMessages } from '@/app/features/chat-page/chat-feed/reverted-messages';
import { SessionDiff } from '@/app/features/chat-page/chat-feed/session-diff';
import { SessionTodos } from '@/app/features/chat-page/chat-feed/session-todos';
import { useChatFeedScroll } from '@/app/features/chat-page/chat-feed/use-chat-feed-scroll';
import { useScrollbarWidth } from '@/app/hooks/useScrollbarWidth';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import type { AeroConversationTurn } from '@/server/services/harness/types';

export interface ChatFeedRef {
  /** Jump to the user bubble for a given group index. */
  scrollToIndex: (groupIndex: number) => void;
  /** Scroll to bottom and re-engage auto-follow. */
  scrollToBottom: (smooth?: boolean) => void;
  /** The scroll container element — consumed by scroll-controller registration. */
  scrollRef: React.RefObject<HTMLDivElement | null>;
}

export const ChatFeed = React.memo(
  forwardRef<ChatFeedRef, { groups: AeroConversationTurn[] }>(function ChatFeed(
    { groups },
    ref,
  ) {
    const virtualizerRef = useRef<VirtualizerHandle>(null);
    const scrollRef = useRef<HTMLDivElement>(null);
    const contentRef = useRef<HTMLDivElement>(null);

    const scrollbarWidth = useScrollbarWidth(scrollRef);

    const sessionId = useSessionId();

    const flatItems = useSessionRuntime(sessionId, (r) => r.flatItems);
    const groupFlatIndex = useSessionRuntime(
      sessionId,
      (r) => r.groupFlatIndex,
    );

    const { handleScroll, scrollToGroup, scrollToBottom, isReady } =
      useChatFeedScroll({
        sessionId,
        groups,
        groupFlatIndex,
        flatItemsLength: flatItems.length,
        virtualizerRef,
        scrollRef,
        contentRef,
      });

    // Stable imperative handle. `scrollToGroup` and `scrollToBottom` are
    // useCallbacks with stable deps, and `scrollRef` never changes identity,
    // so this handle is created once per ChatFeed instance.
    useImperativeHandle(
      ref,
      () => ({
        scrollToIndex: scrollToGroup,
        scrollToBottom,
        scrollRef,
      }),
      [scrollToGroup, scrollToBottom],
    );

    const isEmpty = flatItems.length === 0;

    return (
      <div
        className={cn(
          'relative @container flex min-h-0 flex-1 flex-col',
          !isReady && !isEmpty
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
          <div ref={contentRef} className='pb-12'>
            <ChatConversationView
              virtualizerRef={virtualizerRef}
              scrollRef={scrollRef}
              flatItems={flatItems}
              onScroll={handleScroll}
            />
            <div
              className={cn(
                'mx-auto max-w-[720px]',
                flatItems.length > 0 ? '-mt-5' : 'mt-5',
              )}
            >
              <ReplyToQuestion />
              <ReplyToPermission />
              <RevertedMessages />
            </div>
            <SelectionPopover containerRef={contentRef} />
          </div>
        </ScrollShadow>
      </div>
    );
  }),
);
