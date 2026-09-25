import { cn } from '@aero/ui';
import { ChevronsDown } from '@gravity-ui/icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  useChatStore,
  useSessionScroll,
} from '@/app/features/chat-page/chat-feed/chat-store';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { useI18n } from '@/app/hooks/i18n';
import { useSessionId } from '@/app/providers/SessionIdProvider';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

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

export const ScrollToBottomButton = React.memo(function ScrollToBottomButton({
  onScrollToBottom,
  className,
  buttonClassName,
  label,
}: {
  /** Invoked when the hanging button is clicked. */
  onScrollToBottom: () => void;
  /** Placement overrides for the absolutely-positioned wrapper. */
  className?: string;
  /** Extra classes for the button itself. */
  buttonClassName?: string;
  /** Accessible label for the button. */
  label?: string;
}) {
  const { t } = useI18n();
  const showButton = useHangingScrollButton();

  if (!showButton) return null;

  return (
    <button
      type='button'
      onClick={onScrollToBottom}
      aria-label={label ?? t.chatFeed.scrollToBottom}
      className={cn(
        'pointer-events-auto flex shrink-0 items-center gap-1',
        'border-separator bg-surface text-muted hover:text-foreground rounded-lg border px-3 py-1.75 shadow-sm backdrop-blur-sm',
        'transition-colors',
        buttonClassName,
      )}
    >
      <ChevronsDown className='size-3.5' />
    </button>
  );
});
