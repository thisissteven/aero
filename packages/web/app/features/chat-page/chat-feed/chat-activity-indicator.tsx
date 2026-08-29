import { useMemo } from 'react';

import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { formatElapsed, useElapsedTime } from '@/app/hooks/useElapsedTime';
import type {
  AeroConversationTurn,
  AeroSessionStatus,
} from '@/server/services/harness/types';

function getActivityLabel(
  turns: AeroConversationTurn[],
  status: AeroSessionStatus,
) {
  if (status.type === 'idle') {
    return null;
  }

  if (status.type === 'retry') {
    return `Retrying (attempt ${status.attempt})…`;
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
        (part.status === 'pending' || part.status === 'running'),
    );

  if (activeTool) {
    if (activeTool.type === 'tool' && activeTool.toolName === 'question') {
      return 'Assistant is waiting for an answer…';
    }

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
  const turns = useChatStore((state) => state.turns);
  const status = useChatStore((state) => state.status);
  const startedAt = useChatStore((state) => state.streamStartedAt);

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
