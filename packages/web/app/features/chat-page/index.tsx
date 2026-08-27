import React, { useCallback, useEffect, useRef, useState } from 'react';

import { cn } from '@aero/ui';

import { ScrollToBottomButton } from '@/app/components/scroll-to-bottom';
import {
  ChatFeed,
  type ChatFeedRef,
} from '@/app/features/chat-page/chat-feed/chat-feed';
import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { RevertedMessages } from '@/app/features/chat-page/chat-feed/reverted-messages';
import { SessionDiff } from '@/app/features/chat-page/chat-feed/session-diff';
import { SessionTodos } from '@/app/features/chat-page/chat-feed/session-todos';
import { ChatInput } from '@/app/features/chat-page/chat-input/chat-input';
import { ChatTocSection } from '@/app/features/chat-page/chat-toc';
import { SessionNotFound } from '@/app/features/chat-page/session-not-found';
import { formatElapsed, useElapsedTime } from '@/app/hooks/use-elapsed-time';
import type {
  AeroConversationTurn,
  AeroSessionStatus,
} from '@/server/services/harness/types';

export interface ChatPageProps {
  sessionId: string;
  groups: AeroConversationTurn[];
  notFound: boolean;
  revertMessageId?: string;
  workspace?: string;
}

function getActivityLabel(
  turns: AeroConversationTurn[],
  status: AeroSessionStatus,
) {
  if (status.type === 'retry') {
    return `Retrying (attempt ${status.attempt})…`;
  }

  if (status.type === 'idle') {
    return null;
  }

  const lastAssistant = [...turns]
    .reverse()
    .find((turn) => turn.role === 'assistant');

  if (!lastAssistant) {
    return 'Assistant is thinking…';
  }

  const activeTool = [...lastAssistant.parts]
    .reverse()
    .find(
      (part) =>
        part.type === 'tool' &&
        ['pending', 'running'].includes(String(part.status)),
    );

  if (activeTool) {
    return 'Assistant is calling a tool…';
  }

  const hasReasoning = lastAssistant.parts.some(
    (part) => part.type === 'reasoning' && part.text.length > 0,
  );

  if (hasReasoning) {
    return 'Assistant is thinking…';
  }

  const hasText = lastAssistant.parts.some(
    (part) => part.type === 'text' && part.text.length > 0,
  );

  if (hasText) {
    return 'Assistant is responding…';
  }

  return 'Assistant is thinking…';
}

function ChatActivityIndicator({
  turns,
  status,
  startedAt,
}: {
  turns: AeroConversationTurn[];
  status: AeroSessionStatus;
  startedAt: number | null;
}) {
  const elapsed = useElapsedTime(startedAt, status.type !== 'idle');

  const label = getActivityLabel(turns, status);

  if (!label) {
    return null;
  }

  return (
    <div className='text-default-500 flex items-center gap-2 px-1 pb-2 text-xs'>
      <span className='bg-default-400 h-1.5 w-1.5 animate-pulse rounded-full' />
      <span>{label}</span>

      {startedAt !== null && <span>· {formatElapsed(elapsed)}</span>}
    </div>
  );
}

export function ChatPage({
  sessionId,
  groups,
  notFound,
  revertMessageId,
  workspace,
}: ChatPageProps) {
  const [activeGroupIndex, setActiveGroupIndex] = useState(
    () => groups.length - 1,
  );

  useEffect(() => {
    setActiveGroupIndex(groups.length - 1);
  }, [sessionId]);

  const feedRef = useRef<ChatFeedRef>(null);

  const status = useChatStore((state) => state.status);

  const streamStartedAt = useChatStore((state) => state.streamStartedAt);

  const handleSelectTocItem = useCallback(
    (groupIndex: number) => {
      const clamped = Math.min(Math.max(groupIndex, 0), groups.length - 1);

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

          <ChatFeed
            key={sessionId}
            revertMessageId={revertMessageId}
            groups={groups}
            ref={feedRef}
            onActiveGroupIndexChange={setActiveGroupIndex}
          />
        </>
      )}

      <div className='bg-background shrink-0 px-4 pb-2 md:pb-4'>
        <div className='relative mx-auto w-full max-w-[720px]'>
          <ChatActivityIndicator
            turns={groups}
            status={status}
            startedAt={streamStartedAt}
          />

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
