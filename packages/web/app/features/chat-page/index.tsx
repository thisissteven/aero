// chat-page.tsx

import { cn } from '@aero/ui';
import { useCallback, useEffect, useRef } from 'react';
import { ChatQuotesPanel } from '@/app/components/chat-quotes-panel';
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
import { useMainChatScrollStore } from '@/app/stores/chat-scroll-store';
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
  const feedRef = useRef<ChatFeedRef | null>(null);

  const registerScrollToIndex = useMainChatScrollStore(
    (state) => state.registerScrollToIndex,
  );
  const registerScrollToBottom = useMainChatScrollStore(
    (state) => state.registerScrollToBottom,
  );

  // Register once. The callback dereferences `feedRef.current` at invocation
  // time, so we don't need to re-register when the feed remounts on session
  // switch (which is what the `key={sessionId}` below causes).
  useEffect(() => {
    registerScrollToIndex((groupIndex) => {
      feedRef.current?.scrollToIndex(groupIndex);
    });

    return () => registerScrollToIndex(null);
  }, [registerScrollToIndex]);

  useEffect(() => {
    registerScrollToBottom(() => {
      feedRef.current?.scrollToBottom(true);
    });

    return () => registerScrollToBottom(null);
  }, [registerScrollToBottom]);

  const handleSelectTocItem = useCallback((groupIndex: number) => {
    useMainChatScrollStore.getState().scrollToIndex(groupIndex);
  }, []);

  const handleScrollToBottom = useCallback(() => {
    feedRef.current?.scrollToBottom(true);
  }, []);

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

          <ChatTocSection onSelectTocItem={handleSelectTocItem} />

          <ChatFeed key={sessionId} groups={groups} ref={feedRef} />
        </>
      )}

      <div className='shrink-0 px-4 pb-2'>
        <div className='@container relative mx-auto w-full max-w-[720px]'>
          <OfflineWrapper>
            <WithScrollToBottomWrapper
              type='main'
              onScrollToBottom={handleScrollToBottom}
            >
              <ChatActivityIndicator />
            </WithScrollToBottomWrapper>

            <div className='absolute right-0 -translate-y-full'>
              <SessionTodos sessionId={sessionId} />
              <SessionDiff workspace={workspace} />
            </div>
          </OfflineWrapper>
          <ChatQuotesPanel />
          <ChatInput isDisabled={notFound} sessionId={sessionId} />
        </div>
      </div>
    </div>
  );
}
