import {
  ArrowUturnCcwLeft,
  Clock,
  CodeFork,
  Copy,
  Pin,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import {
  memo,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { ChatMessage, cn, Tooltip } from '@aero/ui';

import { formatDateTime } from '@/app/lib/date';
import { AeroConversationTurn } from '@/server/services/harness/types';

// ---------------------------------------------------------------------------
// UserChatBubble
//
// FIX: Replaced the `useEffect` + `el.scrollHeight` read with a ResizeObserver.
// Reading scrollHeight in useEffect forces a synchronous layout flush on every
// streaming character. ResizeObserver is notified *after* the browser has
// already committed layout, so we get the measurement for free with zero
// additional reflow cost.
// ---------------------------------------------------------------------------
export const UserChatBubble = memo(
  function UserChatBubble({ turn }: { turn: AeroConversationTurn }) {
    const [expanded, setExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);

    const bubbleRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const shouldScrollOnCollapseRef = useRef(false);

    // Sync check before the first paint so the clamp is applied immediately —
    // no visible flicker. useLayoutEffect fires after DOM mutations but before
    // the browser paints; layout is already computed at this point so reading
    // scrollHeight here doesn't trigger an extra reflow.
    useLayoutEffect(() => {
      const el = textRef.current;
      if (el) setIsOverflowing(el.scrollHeight > 72);
    }, []);

    // ResizeObserver handles subsequent updates (text streaming, window resize).
    // Kept separate from the layout effect so it only pays the observer overhead
    // for the ongoing lifecycle, not the initial render.
    useEffect(() => {
      const el = textRef.current;
      if (!el) return;

      const observer = new ResizeObserver(() => {
        setIsOverflowing(el.scrollHeight > 72);
      });

      observer.observe(el);
      return () => observer.disconnect();
    }, []);

    const handleToggle = () => {
      if (expanded) {
        shouldScrollOnCollapseRef.current = true;
      }
      setExpanded((prev) => !prev);
    };

    useLayoutEffect(() => {
      if (!shouldScrollOnCollapseRef.current || expanded || !bubbleRef.current)
        return;

      shouldScrollOnCollapseRef.current = false;

      const bubbleEl = bubbleRef.current;
      const scrollContainer = bubbleEl.closest<HTMLElement>('.overflow-y-auto');

      if (scrollContainer) {
        const topOffset = 40;
        const containerRect = scrollContainer.getBoundingClientRect();
        const bubbleRect = bubbleEl.getBoundingClientRect();
        const targetScrollTop =
          scrollContainer.scrollTop +
          (bubbleRect.top - containerRect.top) -
          topOffset;

        scrollContainer.scrollTo({
          top: Math.max(0, targetScrollTop),
          behavior: 'instant',
        });
      } else {
        bubbleEl.scrollIntoView({ behavior: 'instant', block: 'start' });
      }
    }, [expanded]);

    const text = useMemo(
      () =>
        turn.parts
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join(''),
      [],
    );

    return (
      <ChatMessage.User ref={bubbleRef} className='relative'>
        <ChatMessage.Bubble className='max-w-4/5'>
          <div className='relative'>
            <div
              ref={textRef}
              className={cn(
                'wrap-break-word',
                !expanded && isOverflowing && 'line-clamp-2',
              )}
            >
              {text}
            </div>

            {isOverflowing && (
              <button
                className='text-muted mt-1 text-xs opacity-80 transition hover:opacity-100'
                onClick={handleToggle}
              >
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </ChatMessage.Bubble>
        <div className='absolute right-0 bottom-0 flex w-full translate-y-full justify-end gap-3 p-3'>
          <div className='flex items-center gap-1 text-xs opacity-50'>
            <Icon data={Clock} size={12} />
            {formatDateTime(turn.createdAt)}
          </div>
          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <Icon
                data={ArrowUturnCcwLeft}
                size={16}
                className='opacity-50 transition hover:opacity-100'
              />
            </Tooltip.Trigger>

            <Tooltip.Content>
              <span>Revert from here</span>
            </Tooltip.Content>
          </Tooltip>
          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <Icon
                data={CodeFork}
                size={16}
                className='opacity-50 transition hover:opacity-100'
              />
            </Tooltip.Trigger>

            <Tooltip.Content>
              <span>Fork from here</span>
            </Tooltip.Content>
          </Tooltip>
          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <Icon
                data={Pin}
                size={16}
                className='opacity-50 transition hover:opacity-100'
              />
            </Tooltip.Trigger>

            <Tooltip.Content>
              <span>Pin into context (survives compaction)</span>
            </Tooltip.Content>
          </Tooltip>
          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <Icon
                data={Copy}
                size={16}
                className='opacity-50 transition hover:opacity-100'
              />
            </Tooltip.Trigger>

            <Tooltip.Content>
              <span>Copy message</span>
            </Tooltip.Content>
          </Tooltip>
        </div>
      </ChatMessage.User>
    );
  },
  (prev, next) => prev.turn.id === next.turn.id,
);
