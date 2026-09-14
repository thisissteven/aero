import { cn } from '@aero/ui';
import { useCallback, useEffect, useRef, useState } from 'react';
import { OpenSubagentsList } from '@/app/components/chat-aside/side-chat/open-subagents-list';
import { useSideChatStore } from '@/app/components/chat-aside/side-chat/side-chat-store';
import { SubagentsList } from '@/app/components/chat-aside/side-chat/subagents-list';
import { useRegisterScrollContainer } from '@/app/components/scroll-to-bottom/use-register-scroll-container';
import { useSideScrollController } from '@/app/components/scroll-to-bottom/use-scroll-controller';
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
import { ChatTocSection } from '@/app/features/chat-page/chat-toc';
import { SessionNotFound } from '@/app/features/chat-page/session-not-found';
import { useSessionPage } from '@/app/features/session-page';
import { OfflineWrapper } from '@/app/providers';
import {
  SessionIdProvider,
  useSessionId,
} from '@/app/providers/SessionIdProvider';
import { useSideChatScrollStore } from '@/app/stores/chat-scroll-store';

export function SideChatPanel() {
  const sessionId = useSideChatStore((state) => state.sessionId);
  const view = useSideChatStore((state) => state.view);
  return (
    <SessionIdProvider value={sessionId}>
      {view === 'detail' ? <SideChatPage /> : <SubagentsList />}
    </SessionIdProvider>
  );
}

export function SideChatPage() {
  const sessionId = useSessionId();

  const { session, turns: groups, notFound } = useSessionPage(sessionId);
  const workspace = session?.workspace;

  const [activeGroupIndex, setActiveGroupIndex] = useState(() =>
    Math.max(groups.length - 1, 0),
  );

  const feedRef = useRef<ChatFeedRef | null>(null);
  const registerScrollToIndex = useSideChatScrollStore(
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
    useSideChatScrollStore.getState().scrollToIndex(groupIndex);
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
    (cb: () => void) =>
      feedRef.current?.subscribeScroll(cb) ??
      (() => {
        //
      }),
    [],
  );

  useRegisterScrollContainer(
    feedRef.current?.scrollRef ?? null,
    useSideScrollController,
  );

  return (
    <div
      className={cn(
        'ease relative flex h-[calc(100svh-56px-48px)] flex-col justify-center overflow-hidden',
      )}
    >
      {notFound ? (
        <SessionNotFound sessionId={sessionId} />
      ) : (
        <>
          <OpenSubagentsList />

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
              type='side'
            >
              <ChatActivityIndicator />
            </WithScrollToBottomWrapper>

            <div className='absolute right-0 -translate-y-full'>
              <SessionTodos sessionId={sessionId} />
              <SessionDiff workspace={workspace} />
            </div>
          </OfflineWrapper>

          <div className='text-muted text-sm text-center py-4'>
            Subagent sessions cannot be prompted.
          </div>
        </div>
      </div>
    </div>
  );
}
