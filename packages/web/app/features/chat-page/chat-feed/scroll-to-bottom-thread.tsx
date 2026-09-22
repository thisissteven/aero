// scroll-to-bottom-thread.tsx

import { ChevronsDown } from '@gravity-ui/icons';
import React, { ReactNode, useEffect, useRef, useState } from 'react';
import {
  useChatStore,
  useSessionScroll,
} from '@/app/features/chat-page/chat-feed/chat-store';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { useSessionId } from '@/app/providers/SessionIdProvider';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal class joiner — no tailwind-merge dependency. */
function cx(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(' ');
}

const SHOW_BUTTON_DELAY_MS = 300;

/**
 * Owns the "has the user drifted away from the bottom, and stayed away long
 * enough that we should offer them a way back?" question.
 *
 * The 300ms debounce is a presentation detail, so it lives in local state
 * rather than in the store. When the timer fires we re-read the store to make
 * sure the user didn't already scroll back down during the window.
 */
function useHangingScrollButton() {
  const sessionId = useSessionId();

  const isAtBottom = useSessionScroll(sessionId, (s) => s.isAtBottom);
  const isChatInputExpanded = useChatInputExpanded();

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

  return showButton && !isChatInputExpanded;
}

// ---------------------------------------------------------------------------
// ScrollToBottomThread
// ---------------------------------------------------------------------------

/**
 * A thread that hangs from the top edge of a `position: relative` parent, with
 * a scroll-to-bottom button dangling from its lower end.
 *
 * Geometry:
 *   - The wrapper is `absolute inset-y-0`, so the thread + button never exceed
 *     the parent's height. The thread is `flex-1 min-h-0`, which means it
 *     absorbs whatever space the button leaves and collapses to zero rather
 *     than pushing the button out of bounds.
 *   - Horizontally it defaults to centered (`left-1/2 -translate-x-1/2`); pass
 *     `className` to place it anywhere else.
 *   - The wrapper is `pointer-events-none` so it never swallows clicks on the
 *     feed behind it; only the button re-enables pointer events.
 *
 * Visibility:
 *   - Renders only once the user has been away from the bottom for 300ms, and
 *     disappears immediately on return. It is also suppressed while the chat
 *     input is expanded.
 */
export const ScrollToBottomThread = React.memo(function ScrollToBottomThread({
  onScrollToBottom,
  children,
  className,
  threadClassName,
  buttonClassName,
  label = 'Scroll to bottom',
}: {
  /** Invoked when the hanging button is clicked. */
  onScrollToBottom: () => void;
  /** Optional content rendered inside the button, after the chevron. */
  children?: ReactNode;
  /** Placement overrides for the absolutely-positioned wrapper. */
  className?: string;
  /** Extra classes for the thread line itself. */
  threadClassName?: string;
  /** Extra classes for the button itself. */
  buttonClassName?: string;
  /** Accessible label for the button. */
  label?: string;
}) {
  const showButton = useHangingScrollButton();

  if (!showButton) return null;

  return (
    <>
      <style>
        {`
          @keyframes scroll-thread-drop {
            from {
              opacity: 0;
              transform: translateY(-4px);
            }

            to {
              opacity: 1;
              transform: translateY(0);
            }
          }

          @media (prefers-reduced-motion: reduce) {
            .scroll-thread-motion {
              animation: none !important;
            }
          }
        `}
      </style>

      <div
        className={cx(
          'pointer-events-none absolute inset-y-0 left-1/2 z-10 flex -translate-x-1/2 flex-col items-center',
          className,
        )}
      >
        {/* The thread. Fades in from the top so it reads as descending out of
            the message list above rather than starting from a hard edge. */}
        <span
          aria-hidden
          className={cx(
            'min-h-0 w-px flex-1 bg-gradient-to-b from-transparent to-separator',
            threadClassName,
          )}
        />

        <button
          type='button'
          onClick={onScrollToBottom}
          aria-label={label}
          className={cx(
            'scroll-thread-motion pointer-events-auto mb-2 flex shrink-0 items-center gap-1',
            'border-separator bg-background/80 text-muted hover:text-foreground rounded-full border px-2 py-1 shadow-sm backdrop-blur-sm',
            'transition-colors',
            buttonClassName,
          )}
        >
          <ChevronsDown className='size-3.5' />
          {children}
        </button>
      </div>
    </>
  );
});
