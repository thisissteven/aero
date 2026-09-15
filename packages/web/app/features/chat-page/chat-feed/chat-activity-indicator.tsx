// chat-activity-indicator.tsx

import { ChevronsDown } from '@gravity-ui/icons';
import React, { ReactNode, useEffect, useMemo, useRef, useState } from 'react';
import {
  useChatStore,
  useSessionRuntime,
  useSessionScroll,
} from '@/app/features/chat-page/chat-feed/chat-store';
import { useSession } from '@/app/hooks/api/sessions';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { formatElapsed, useElapsedTime } from '@/app/hooks/useElapsedTime';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import type {
  AeroConversationTurn,
  AeroSessionStatus,
} from '@/server/services/harness/types';

// ---------------------------------------------------------------------------
// ChatActivityIndicator — unchanged
// ---------------------------------------------------------------------------

function getActivityLabel(
  role: string,
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
    return `${role} is thinking…`;
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
      return `${role} is waiting for an answer…`;
    }

    if (activeTool.type === 'tool' && activeTool.toolName === 'task') {
      return 'Subagent is working…';
    }

    return `${role} is calling a tool…`;
  }

  const hasReasoning = lastAssistant.parts.some(
    (part) => part.type === 'reasoning' && part.text.length > 0,
  );

  if (hasReasoning) {
    return `${role} is thinking…`;
  }

  const hasText = lastAssistant.parts.some(
    (part) => part.type === 'text' && part.text.length > 0,
  );

  if (hasText) {
    return `${role} is responding…`;
  }

  return `${role} is thinking…`;
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

export const ChatActivityIndicator = React.memo(
  function ChatActivityIndicator() {
    const sessionId = useSessionId();

    const turns = useSessionRuntime(sessionId, (runtime) => runtime.turns);
    const status = useSessionRuntime(sessionId, (runtime) => runtime.status);
    const startedAt = useSessionRuntime(
      sessionId,
      (runtime) => runtime.streamStartedAt,
    );

    const elapsed = useElapsedTime(startedAt, status.type !== 'idle');

    const { data: session } = useSession(undefined, sessionId);

    const isSubagent = Boolean(session?.parentId);
    const role = isSubagent ? 'Subagent' : 'Assistant';

    const label = useMemo(
      () => getActivityLabel(role, turns, status),
      [role, turns, status],
    );

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

        <PixelLoader />

        <span
          className='chat-activity-motion bg-clip-text text-[13px] font-medium text-transparent'
          style={{
            backgroundImage:
              'linear-gradient(90deg, var(--foreground-muted) 35%, var(--foreground) 50%, var(--foreground-muted) 65%)',
            backgroundSize: '200% 100%',
            animation: 'chat-activity-shimmer 1.4s linear infinite',
            color: 'var(--foreground)',
          }}
        >
          {label}
        </span>

        {startedAt !== null && (
          <span className='text-muted-foreground mt-0.5 text-xs tabular-nums'>
            {formatElapsed(elapsed)}
          </span>
        )}
      </>
    );
  },
);

// ---------------------------------------------------------------------------
// WithScrollToBottomWrapper — rewritten
// ---------------------------------------------------------------------------

const SHOW_BUTTON_DELAY_MS = 300;

export const WithScrollToBottomWrapper = React.memo(
  function WithScrollToBottomWrapper({
    onScrollToBottom,
    children,
    type,
  }: {
    onScrollToBottom: () => void;
    children: ReactNode;
    type: 'main' | 'side';
  }) {
    const sessionId = useSessionId();

    // Two primitive selectors so Zustand's Object.is check short-circuits
    // re-renders that don't change either value.
    const isAtBottom = useSessionScroll(sessionId, (s) => s.isAtBottom);

    const status = useSessionRuntime(sessionId, (runtime) => runtime.status);
    const isChatInputExpanded = useChatInputExpanded();

    // Local UI-only state: the button appears 300ms after the user leaves
    // the bottom, and disappears immediately on return. Keeping this local
    // avoids the store having to encode a presentation timing rule.
    const [showButton, setShowButton] = useState(false);
    const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
      if (isAtBottom) {
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
        setShowButton(false);
        return;
      }

      if (timeoutRef.current !== null) return;

      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        // Re-read from the store: the user may have returned to the bottom
        // during the 300ms window, in which case we don't show the button.
        const current = useChatStore.getState().scrollBySession[sessionId];
        if (current?.isAtBottom === false) {
          setShowButton(true);
        }
      }, SHOW_BUTTON_DELAY_MS);

      return () => {
        if (timeoutRef.current !== null) {
          clearTimeout(timeoutRef.current);
          timeoutRef.current = null;
        }
      };
    }, [isAtBottom, sessionId]);

    if (status.type === 'idle' && !showButton) return null;
    if (isChatInputExpanded) return null;

    return (
      <div
        className='absolute left-0 -translate-y-full'
        data-scroll-to-bottom-type={type}
      >
        <button
          role='status'
          aria-live='polite'
          className='border-separator text-muted mx-2 mb-1 flex shrink-0 items-center gap-1 rounded-full border bg-transparent px-2 py-1 backdrop-blur-sm'
          disabled={!showButton}
          onClick={showButton ? onScrollToBottom : undefined}
        >
          {showButton && <ChevronsDown className='size-3.5' />}
          {children}
        </button>
      </div>
    );
  },
);
