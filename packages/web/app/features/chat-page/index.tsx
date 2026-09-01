import React, { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@aero/ui';

import { useChatStore } from '@/app/components/message-view/unused/streaming-demo/streaming-demo-store';
import {
  ScrollToBottomButton,
  useRegisterScrollContainer,
} from '@/app/components/scroll-to-bottom';
import { ChatActivityIndicator } from '@/app/features/chat-page/chat-feed/chat-activity-indicator';
import {
  ChatFeed,
  type ChatFeedRef,
} from '@/app/features/chat-page/chat-feed/chat-feed';
import { ReplyToQuestion } from '@/app/features/chat-page/chat-feed/reply-to-question';
import { RevertedMessages } from '@/app/features/chat-page/chat-feed/reverted-messages';
import { SessionDiff } from '@/app/features/chat-page/chat-feed/session-diff';
import { SessionTodos } from '@/app/features/chat-page/chat-feed/session-todos';
import { ChatInput } from '@/app/features/chat-page/chat-input/chat-input';
import { ChatTocSection } from '@/app/features/chat-page/chat-toc';
import { SessionNotFound } from '@/app/features/chat-page/session-not-found';

export interface ChatPageProps {
  sessionId: string;
  notFound: boolean;
  revertMessageId?: string;
  workspace?: string;
}

export function ChatPage({ sessionId, notFound, workspace }: ChatPageProps) {
  const flatItems = useChatStore(sessionId, (state) => state.flatItems);

  const [activeGroupIndex, setActiveGroupIndex] = useState(() =>
    Math.max(flatItems.length - 1, 0),
  );

  const feedRef = useRef<ChatFeedRef | null>(null);

  const handleSelectTocItem = useCallback(
    (groupIndex: number) => {
      const clamped = Math.min(
        Math.max(groupIndex, 0),
        Math.max(flatItems.length - 1, 0),
      );

      feedRef.current?.scrollToIndex(clamped);
    },
    [flatItems.length],
  );

  /**
   * When switching sessions, start at the latest group.
   *
   * Also handles the initial async hydration.
   */
  useEffect(() => {
    setActiveGroupIndex(Math.max(flatItems.length - 1, 0));
  }, [sessionId, flatItems.length]);

  const subscribeScroll = useCallback(
    (cb: () => void) => feedRef.current?.subscribeScroll(cb) ?? (() => {}),
    [],
  );

  useRegisterScrollContainer(feedRef.current?.scrollRef ?? null);

  return (
    <div
      className={cn(
        'ease relative flex h-[calc(100svh-var(--chat-navbar-height,56px))] flex-col justify-center overflow-hidden',
      )}
    >
      {notFound ? (
        <SessionNotFound sessionId={sessionId} />
      ) : (
        <>
          <ChatTocSection
            activeGroupIndex={activeGroupIndex}
            onSelectTocItem={handleSelectTocItem}
          />

          <ChatFeed
            key={sessionId}
            ref={feedRef}
            onActiveGroupIndexChange={setActiveGroupIndex}
          />
        </>
      )}

      <div className='bg-background shrink-0 px-4 pb-2 md:pb-4'>
        <div className='relative mx-auto w-full max-w-[720px]'>
          <ReplyToQuestion />

          <ChatActivityIndicator />

          <div className='pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2'>
            <ScrollToBottomButton
              key={sessionId}
              scrollRef={{
                get current() {
                  return feedRef.current?.scrollRef.current ?? null;
                },
              }}
              subscribeScroll={subscribeScroll}
            />
          </div>

          <RevertedMessages />

          <div className='@container flex items-center justify-between'>
            <SessionDiff workspace={workspace} />
            <SessionTodos />
          </div>

          <ChatInput isDisabled={notFound} />
        </div>
      </div>
    </div>
  );
}
