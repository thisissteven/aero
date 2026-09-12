import React, { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@aero/ui';

import { useRegisterScrollContainer } from '@/app/components/scroll-to-bottom';
import {
  ChatActivityIndicator,
  WithScrollToBottomWrapper,
} from '@/app/features/chat-page/chat-feed/chat-activity-indicator';
import {
  ChatFeed,
  type ChatFeedRef,
} from '@/app/features/chat-page/chat-feed/chat-feed';
import { SessionDiff } from '@/app/features/chat-page/chat-feed/session-diff';
import { SessionTodos } from '@/app/features/chat-page/chat-feed/session-todos';
import { ChatInput } from '@/app/features/chat-page/chat-input/chat-input';
import { ChatTocSection } from '@/app/features/chat-page/chat-toc';
import { OpenParentSession } from '@/app/features/chat-page/open-parent-session';
import { SessionNotFound } from '@/app/features/chat-page/session-not-found';
import { OfflineWrapper } from '@/app/providers';
import { useChatScrollStore } from '@/app/stores/chat-scroll-store';
import type { AeroConversationTurn } from '@/server/services/harness/types';

export interface ChatPageProps {
  sessionId: string;
  groups: AeroConversationTurn[];
  notFound: boolean;
  revertMessageId?: string;
  workspace?: string;
}

export function ChatPage({
  sessionId,
  groups,
  notFound,
  workspace,
}: ChatPageProps) {
  const [activeGroupIndex, setActiveGroupIndex] = useState(() =>
    Math.max(groups.length - 1, 0),
  );

  const feedRef = useRef<ChatFeedRef | null>(null);
  const registerScrollToIndex = useChatScrollStore(
    (state) => state.registerScrollToIndex,
  );

  useEffect(() => {
    registerScrollToIndex((groupIndex: number) => {
      const clamped = Math.min(
        Math.max(groupIndex, 0),
        Math.max(groups.length - 1, 0),
      );

      feedRef.current?.scrollToIndex(clamped);
    });

    return () => registerScrollToIndex(null);
  }, [groups.length, registerScrollToIndex]);

  const handleSelectTocItem = useCallback((groupIndex: number) => {
    useChatScrollStore.getState().scrollToIndex(groupIndex);
  }, []);

  /**
   * When switching sessions, start at the latest group.
   *
   * Also handles the initial async hydration.
   */
  useEffect(() => {
    setActiveGroupIndex(Math.max(groups.length - 1, 0));
  }, [sessionId, groups.length]);

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
          <OpenParentSession sessionId={sessionId} />

          <ChatTocSection
            activeGroupIndex={activeGroupIndex}
            onSelectTocItem={handleSelectTocItem}
          />

          <ChatFeed
            key={sessionId}
            groups={groups}
            ref={feedRef}
            onActiveGroupIndexChange={setActiveGroupIndex}
          />
        </>
      )}

      <div className='shrink-0 px-4 pb-2'>
        <div className='@container relative mx-auto w-full max-w-[720px]'>
          <OfflineWrapper>
            <WithScrollToBottomWrapper
              scrollRef={{
                get current() {
                  return feedRef.current?.scrollRef.current ?? null;
                },
              }}
              subscribeScroll={subscribeScroll}
            >
              <ChatActivityIndicator />
            </WithScrollToBottomWrapper>

            <div className='absolute right-0 -translate-y-full'>
              <SessionTodos sessionId={sessionId} />
              <SessionDiff workspace={workspace} />
            </div>
          </OfflineWrapper>

          <ChatInput isDisabled={notFound} sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}
