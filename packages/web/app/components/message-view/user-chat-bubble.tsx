import { Clock, Pin } from '@gravity-ui/icons';
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

import {
  MessageActionsCopy,
  MessageActionsFork,
  MessageActionsRevert,
} from '@/app/components/message-view/message-actions';
import { IconButton } from '@/app/components/ui/icon-button';
import { useKeepMountedFeed } from '@/app/hooks/useKeepMounted';
import { formatDateTime } from '@/app/lib/date';
import { AeroConversationTurn } from '@/server/services/harness/types';

export const UserChatBubble = memo(
  function UserChatBubble({
    turn,
    forkMessageId,
  }: {
    turn: AeroConversationTurn;
    forkMessageId: string;
  }) {
    const [expanded, setExpanded] = useState(false);
    const [isOverflowing, setIsOverflowing] = useState(false);

    const bubbleRef = useRef<HTMLDivElement>(null);
    const textRef = useRef<HTMLDivElement>(null);
    const shouldScrollOnCollapseRef = useRef(false);

    useKeepMountedFeed(turn.id, expanded);

    const text = useMemo(
      () =>
        turn.parts
          .filter((part) => part.type === 'text')
          .map((part) => part.text)
          .join(''),
      [turn.parts],
    );

    // Synchronous layout effect for initial clamp without flicker
    useLayoutEffect(() => {
      const el = textRef.current;
      if (!el) return;

      // Temporary check on scrollHeight vs clientHeight or a fixed max threshold
      const overflow = el.scrollHeight > 72;
      setIsOverflowing(overflow);
    }, [text]);

    // ResizeObserver observing container width changes rather than height changes
    useEffect(() => {
      const el = textRef.current;
      if (!el) return;

      const observer = new ResizeObserver(() => {
        // Only measure height when fully expanded OR check raw scrollHeight
        // against client height threshold
        const overflow = el.scrollHeight > 72;
        setIsOverflowing((prev) => (prev !== overflow ? overflow : prev));
      });

      observer.observe(el);
      return () => observer.disconnect();
    }, [text]);

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

    return (
      <ChatMessage.User ref={bubbleRef} className='relative'>
        <ChatMessage.Bubble
          className={cn(
            'max-w-4/5',
            isOverflowing && !expanded && 'cursor-pointer',
          )}
          onClick={() => {
            if (expanded) return;
            handleToggle();
          }}
        >
          <div className='relative'>
            <div
              ref={textRef}
              className={cn(
                'overflow-hidden font-sans break-words whitespace-pre-wrap',
                !expanded && isOverflowing && 'line-clamp-2',
              )}
            >
              {text}
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
                {expanded ? 'Show less' : 'Show more'}
              </button>
            )}
          </div>
        </ChatMessage.Bubble>

        <div className='mt-3 flex w-full justify-end gap-2 pb-3'>
          <div className='text-muted flex items-center gap-1 text-xs opacity-100'>
            <Icon data={Clock} size={12} className='opacity-80' />
            {formatDateTime(turn.createdAt)}
          </div>
          <div>
            <MessageActionsRevert messageId={forkMessageId} />
            <MessageActionsFork messageId={forkMessageId} />
            <Tooltip delay={300}>
              <IconButton>
                <Icon data={Pin} />
              </IconButton>

              <Tooltip.Content placement='bottom' offset={8}>
                <span>Pin into context (survives compaction)</span>
              </Tooltip.Content>
            </Tooltip>
            <MessageActionsCopy copyText={text} />
          </div>
        </div>
      </ChatMessage.User>
    );
  },
  (prev, next) => prev.turn.id === next.turn.id,
);
