import { ChatMessage, cn, Markdown } from '@aero/ui';
import { memo, useLayoutEffect, useMemo, useRef, useState } from 'react';

import {
  MessageActionsCopy,
  MessageActionsFork,
  MessageActionsPin,
  MessageActionsRevert,
} from '@/app/components/message-view/message-actions';
import { formatDateTime } from '@/app/lib/date';
import { useKeepMountedStoreFeed } from '@/app/stores/keep-mounted';
import { AeroConversationTurn } from '@/server/services/harness/types';

export const UserChatBubble = memo(
  function UserChatBubble({
    turn,
    forkMessageId,
  }: {
    turn: AeroConversationTurn;
    forkMessageId: string;
  }) {
    const [isOverflowing, setIsOverflowing] = useState(false);

    const bubbleRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);

    const text = useMemo(
      () =>
        turn.parts
          .filter(
            (part) =>
              part.type === 'text' ||
              part.type === 'subtask' ||
              part.type === 'compaction',
          )
          .map((part) => {
            if (part.type === 'text') return part.text;
            if (part.type === 'compaction') return '/compact';
            if (part.type === 'subtask') return part.prompt;
            return undefined;
          })
          .join('\n'),
      [turn.parts],
    );

    // Measure synchronously before paint, so the first committed layout already
    // has the correct clamped height. This is what stops Virtua from measuring
    // a tall unclamped bubble and then having to compensate when the observer
    // fires a frame later — the "scroll fights back on wheel-up" symptom.
    useLayoutEffect(() => {
      const el = textRef.current;
      if (!el) return;

      const measure = () => {
        const overflow = el.scrollHeight > 96;
        setIsOverflowing((prev) => (prev !== overflow ? overflow : prev));
      };

      measure();

      // Re-measure on width changes (sidebar toggle, window resize, etc.).
      // Height changes from our own clamp don't matter — they can't flip the
      // overflow boolean.
      const observer = new ResizeObserver(measure);
      observer.observe(el);
      return () => observer.disconnect();
    }, [text]);

    const isExpanded = useKeepMountedStoreFeed((s) => Boolean(s.ids[turn.id]));

    const setKeep = useKeepMountedStoreFeed((s) => s.setKeep);

    const handleToggle = () => {
      const bubbleEl = bubbleRef.current;
      if (isExpanded && bubbleEl) {
        const scrollContainer =
          bubbleEl.closest<HTMLElement>('.overflow-y-auto');

        if (scrollContainer) {
          const topOffset = 32;
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
      }
      setKeep(turn.id, !isExpanded);
    };

    return (
      <ChatMessage.User ref={bubbleRef} className='relative'>
        <ChatMessage.Bubble
          className={cn(
            'max-w-4/5 px-3 rounded-xl',
            isOverflowing && !isExpanded && 'cursor-pointer',
          )}
          onClick={() => {
            if (isExpanded) return;
            handleToggle();
          }}
        >
          <div className='relative'>
            <div
              ref={textRef}
              className={cn(!isExpanded && isOverflowing && 'line-clamp-3')}
            >
              <Markdown id={turn.id} streaming={false} streamRevealPreset='off'>
                {text}
              </Markdown>
            </div>

            {isOverflowing && (
              <button
                type='button'
                className='text-muted mt-1 text-xs opacity-80 transition hover:opacity-100'
                onClick={(e) => {
                  e.stopPropagation();
                  handleToggle();
                }}
              >
                {isExpanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </ChatMessage.Bubble>

        <div className='mt-3 flex w-full items-center justify-end gap-2 pb-3'>
          <div className='text-muted text-xs select-none'>
            {formatDateTime(turn.createdAt)}
          </div>
          <div>
            <MessageActionsRevert messageId={forkMessageId} />
            <MessageActionsFork messageId={forkMessageId} />
            <MessageActionsPin messageId={turn.id} />
            <MessageActionsCopy copyText={text} />
          </div>
        </div>
      </ChatMessage.User>
    );
  },
  (prev, next) =>
    prev.turn.id === next.turn.id && prev.forkMessageId === next.forkMessageId,
);
