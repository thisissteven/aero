import { useParams } from '@tanstack/react-router';
import { useMemo } from 'react';

import { useChatStore } from '@/app/components/message-view/unused/streaming-demo/streaming-demo-store';
import { FlatItem } from '@/app/components/message-view/unused/streaming-demo/streaming-demo-types';
import { formatElapsed, useElapsedTime } from '@/app/hooks/useElapsedTime';
import type { AeroSessionStatus } from '@/server/services/harness/types';

export function getActivityLabel(
  flatItems: FlatItem[],
  status: AeroSessionStatus,
): string | null {
  if (status.type === 'idle') {
    return null;
  }

  if (status.type === 'retry') {
    return `Retrying (attempt ${status.attempt})…`;
  }

  // Collect all assistant parts for the latest assistant turn
  const lastAssistantParts = [];
  let latestTurnId: string | null = null;

  for (let i = flatItems.length - 1; i >= 0; i--) {
    const item = flatItems[i];
    if (item.type === 'assistant-part') {
      if (latestTurnId === null) {
        latestTurnId = item.turnId;
      }

      // Stop once we move past the latest assistant turn
      if (item.turnId !== latestTurnId) {
        break;
      }

      lastAssistantParts.push(item.part);
    }
  }

  if (lastAssistantParts.length === 0) {
    return 'Assistant is thinking…';
  }

  // 1. Check for active/pending tools or questions
  const activeTool = lastAssistantParts.find((part) => {
    return (
      part.type === 'tool' &&
      (part.status === 'pending' || part.status === 'running')
    );
  });

  if (activeTool) {
    const isQuestion =
      activeTool.type === 'tool' && activeTool.toolName === 'question';

    if (isQuestion) {
      return 'Assistant is waiting for an answer…';
    }

    return 'Assistant is calling a tool…';
  }

  // 2. Check for active reasoning/thinking
  const hasReasoning = lastAssistantParts.some(
    (part) =>
      part.type === 'reasoning' && Boolean(part.text && part.text.length > 0),
  );

  if (hasReasoning) {
    return 'Assistant is thinking…';
  }

  // 3. Check for text generation response
  const hasText = lastAssistantParts.some(
    (part) =>
      part.type === 'text' && Boolean(part.text && part.text.length > 0),
  );

  if (hasText) {
    return 'Assistant is responding…';
  }

  return 'Assistant is thinking…';
}

const chevronDelays = Array.from({ length: 9 }, (_, i) => {
  const row = Math.floor(i / 3);
  const column = i % 3;

  return (column + Math.abs(row - 1)) * 90;
});

function PixelLoader() {
  return (
    <span
      aria-hidden
      className='grid shrink-0 scale-75 grid-cols-[repeat(3,4px)] gap-[1.5px]'
    >
      {chevronDelays.map((delay, index) => (
        <span
          key={index}
          className='bg-foreground size-[4px] rounded-[1px]'
          style={{
            opacity: 0.15,
            animation: `chat-activity-pixel 650ms ease-in-out ${delay}ms infinite`,
          }}
        />
      ))}
    </span>
  );
}

export function ChatActivityIndicator() {
  const { sessionId } = useParams({ strict: false });

  const turns = useChatStore(sessionId, (state) => state.flatItems);
  const status = useChatStore(sessionId, (state) => state.status);
  const startedAt = useChatStore(sessionId, (state) => state.streamStartedAt);

  const elapsed = useElapsedTime(startedAt, status.type !== 'idle');

  const label = useMemo(() => getActivityLabel(turns, status), [turns, status]);

  if (!label) {
    return null;
  }

  return (
    <>
      <style>
        {`
          @keyframes chat-activity-pixel {
            0%,
            100% {
              opacity: 0.15;
              transform: scale(0.8);
            }

            50% {
              opacity: 0.8;
              transform: scale(1);
            }
          }

          @keyframes chat-activity-shimmer {
            0% {
              background-position: 200% 0;
            }

            100% {
              background-position: -200% 0;
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .chat-activity-motion {
              animation: none !important;
            }
          }
        `}
      </style>

      <div
        role='status'
        aria-live='polite'
        className='flex items-center gap-2 px-2 pb-2'
      >
        <PixelLoader />

        <span
          className='chat-activity-motion bg-clip-text text-[13px] font-medium text-transparent'
          style={{
            backgroundImage:
              'linear-gradient(90deg, var(--foreground-muted) 35%, var(--foreground) 50%, var(--foreground-muted) 65%)',
            backgroundSize: '200% 100%',
            animation: 'chat-activity-shimmer 1.4s linear infinite',
            color: 'var(--ink)',
          }}
        >
          {label}
        </span>

        {startedAt !== null && (
          <span className='text-muted-foreground mt-0.5 font-mono text-xs tabular-nums'>
            {formatElapsed(elapsed)}
          </span>
        )}
      </div>
    </>
  );
}
