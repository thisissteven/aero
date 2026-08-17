import React, { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@aero/ui';

import { ScrollToBottomButton } from '@/app/components/scroll-to-bottom';
import { ChatFeed } from '@/app/features/chat-page/chat-feed';
import { ChatInput } from '@/app/features/chat-page/chat-input';
import { ChatTocSection } from '@/app/features/chat-page/chat-toc';
import { SessionNotFound } from '@/app/features/chat-page/session-not-found';
import { VirtualizedChatFeedRef } from '@/app/features/chat-page/virtualized-chat-feed';
import { AeroConversationTurn } from '@/server/services/harness/types';

export interface ChatPageProps {
  sessionId: string;
  groups: AeroConversationTurn[];
  notFound: boolean;
}

export function ChatPage({ sessionId, groups, notFound }: ChatPageProps) {
  const [activeGroupIndex, setActiveGroupIndex] = useState(
    () => groups.length - 1,
  );

  useEffect(() => {
    setActiveGroupIndex(groups.length - 1);
  }, [sessionId]);

  const feedRef = useRef<VirtualizedChatFeedRef>(null);

  const handleSelectTocItem = useCallback(
    (groupIndex: number) => {
      const clamped = Math.min(Math.max(groupIndex, 0), groups.length - 1);
      setActiveGroupIndex(clamped);
      feedRef.current?.scrollToIndex(clamped);
    },
    [groups.length],
  );

  const subscribeScroll = useCallback(
    (cb: () => void) => feedRef.current?.subscribeScroll(cb) ?? (() => {}),
    [],
  );

  return (
    <div
      className={cn(
        'ease relative flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col justify-center overflow-hidden',
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
          {/* <VirtualizedChatFeed
            key={sessionId}
            ref={feedRef}
            groups={groups}
            onActiveGroupIndexChange={setActiveGroupIndex}
          /> */}
          {/* <MockChatPage ref={feedRef} mockGroups={groups} /> */}
          <ChatFeed
            groups={groups}
            ref={feedRef}
            onActiveGroupIndexChange={setActiveGroupIndex}
          />
        </>
      )}

      <div className='bg-background shrink-0 px-4 pb-4'>
        <div className='relative mx-auto w-full max-w-[714px]'>
          <div className='pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2'>
            <ScrollToBottomButton
              scrollRef={{
                get current() {
                  return feedRef.current?.scrollRef.current ?? null;
                },
              }}
              subscribeScroll={subscribeScroll}
            />
          </div>

          <ChatInput isDisabled={notFound} />
        </div>
      </div>
    </div>
  );
}
