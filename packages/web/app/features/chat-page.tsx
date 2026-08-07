import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { Virtualizer, type VirtualizerHandle } from 'virtua';

import { FloatingToc, PromptInput, ScrollShadow } from '@aero/ui';

import { MessageView } from '@/app/components/message-view';
import { ScrollToBottomButton } from '@/app/components/scroll-to-bottom';
import { ChatThread } from '@/app/data/chat';
import { useSessionToc } from '@/app/hooks/api/sessions';
import { Route } from '@/app/routes/_app/sessions/$sessionId';

import { AeroConversationTurn } from '../../server/services/harness/types';

// ============================================================================
// 1. TOC Component
// ============================================================================
const ChatTocSection = React.memo(function ChatTocSection({
  activeGroupIndex,
  onSelectTocItem,
}: {
  activeGroupIndex: number;
  onSelectTocItem: (groupIndex: number) => void;
}) {
  const { sessionId } = Route.useParams();
  const { data: tocItems = [] } = useSessionToc(undefined, sessionId);

  const activeTocIndex = useMemo(() => {
    if (!tocItems.length) return -1;
    let activeIdx = 0;
    for (let i = 0; i < tocItems.length; i++) {
      const item = tocItems[i];
      if (item && item.groupIndex <= activeGroupIndex) {
        activeIdx = i;
      } else {
        break;
      }
    }
    return activeIdx;
  }, [tocItems, activeGroupIndex]);

  if (!tocItems.length) return null;

  return (
    <div className='absolute top-1/2 right-6 z-40 translate-y-[calc(-50%-48px)]'>
      <FloatingToc placement='right' triggerMode='hover'>
        <FloatingToc.Trigger aria-label='Table of contents'>
          {tocItems.map((tocItem, idx) => (
            <FloatingToc.Bar
              key={tocItem.id}
              active={idx === activeTocIndex}
              onClick={() => onSelectTocItem(tocItem.groupIndex)}
            />
          ))}
        </FloatingToc.Trigger>

        <FloatingToc.Content>
          {tocItems.map((tocItem, idx) => (
            <FloatingToc.Item
              key={tocItem.id}
              active={idx === activeTocIndex}
              onClick={() => onSelectTocItem(tocItem.groupIndex)}
            >
              <span className='block max-w-[200px] truncate'>
                {tocItem.label}
              </span>
            </FloatingToc.Item>
          ))}
        </FloatingToc.Content>
      </FloatingToc>
    </div>
  );
});

// ============================================================================
// 2. Virtualized Feed
// ============================================================================
export interface VirtualizedChatFeedRef {
  scrollToIndex: (index: number) => void;
  virtualizerRef: React.RefObject<VirtualizerHandle | null>;
  /** Subscribe to scroll ticks without causing a parent re-render. Returns an unsubscribe fn. */
  subscribeScroll: (cb: () => void) => () => void;
}

const renderTurn = (turn: AeroConversationTurn, index: number) => (
  <div
    key={turn?.id ?? index}
    className='mx-auto w-full pb-8 max-xl:pr-12 max-xl:pl-8 xl:max-w-[800px]'
  >
    <MessageView turn={turn} />
  </div>
);

export const VirtualizedChatFeed = React.memo(
  React.forwardRef<
    VirtualizedChatFeedRef,
    {
      groups: ChatThread['turns'];
      onActiveGroupIndexChange: (index: number) => void;
    }
  >(function VirtualizedChatFeed({ groups, onActiveGroupIndexChange }, ref) {
    const virtualizerRef = useRef<VirtualizerHandle>(null);
    const scrollRef = useRef<HTMLDivElement>(null);

    const scrollRafRef = useRef<number | null>(null);
    const isProgrammaticScrollRef = useRef(false);
    const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const scrollListenersRef = useRef(new Set<() => void>());

    // Sorted ascending by construction (groups are in order) -> binary search instead of O(n) scan.
    const userGroupIndexes = useMemo(
      () =>
        groups.reduce<number[]>((acc, group, index) => {
          if (group.role === 'user') acc.push(index);
          return acc;
        }, []),
      [groups],
    );

    const resolveActiveIndex = useCallback(
      (index: number) => {
        const arr = userGroupIndexes;
        if (arr.length === 0) return 0;
        let lo = 0;
        let hi = arr.length - 1;
        let result = arr[0]!;
        while (lo <= hi) {
          const mid = (lo + hi) >> 1;
          const val = arr[mid]!;
          if (val <= index) {
            result = val;
            lo = mid + 1;
          } else {
            hi = mid - 1;
          }
        }
        return result;
      },
      [userGroupIndexes],
    );

    const resolveActiveIndexRef = useRef(resolveActiveIndex);
    useEffect(() => {
      resolveActiveIndexRef.current = resolveActiveIndex;
    }, [resolveActiveIndex]);

    React.useImperativeHandle(
      ref,
      () => ({
        scrollToIndex(index) {
          isProgrammaticScrollRef.current = true;
          if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);

          virtualizerRef.current?.scrollToIndex(index, { align: 'start' });

          scrollTimeoutRef.current = setTimeout(() => {
            isProgrammaticScrollRef.current = false;
          }, 500);
        },
        virtualizerRef,
        subscribeScroll(cb) {
          scrollListenersRef.current.add(cb);
          return () => scrollListenersRef.current.delete(cb);
        },
      }),
      [],
    );

    const handleScroll = useCallback(
      (offset: number) => {
        // Cheap: just ping listeners (e.g. the scroll-to-bottom button). No React state, no re-render here.
        scrollListenersRef.current.forEach((cb) => cb());

        if (isProgrammaticScrollRef.current) return;

        if (scrollRafRef.current !== null) return;
        scrollRafRef.current = requestAnimationFrame(() => {
          scrollRafRef.current = null;
          const handle = virtualizerRef.current;
          if (!handle) return;

          const startIndex = handle.findItemIndex(offset + 60);
          if (startIndex != null && startIndex >= 0) {
            onActiveGroupIndexChange(resolveActiveIndexRef.current(startIndex));
          }
        });
      },
      [onActiveGroupIndexChange],
    );

    useEffect(() => {
      return () => {
        if (scrollRafRef.current !== null) {
          cancelAnimationFrame(scrollRafRef.current);
        }
        if (scrollTimeoutRef.current) {
          clearTimeout(scrollTimeoutRef.current);
        }
      };
    }, []);

    return (
      <div className='relative flex min-h-0 flex-1 flex-col pr-1'>
        <ScrollShadow
          ref={scrollRef}
          className='min-h-0 flex-1 scrollbar-thin overflow-y-auto overscroll-contain pt-10'
        >
          <Virtualizer<AeroConversationTurn>
            ref={virtualizerRef}
            scrollRef={scrollRef}
            data={groups}
            shift={true}
            onScroll={handleScroll}
          >
            {renderTurn}
          </Virtualizer>
        </ScrollShadow>
      </div>
    );
  }),
);

// ============================================================================
// 3. Main Chat Page
// ============================================================================
export interface ChatPageProps {
  groups: AeroConversationTurn[];
}

export function ChatPage({ groups }: ChatPageProps) {
  const [value, setValue] = useState('');
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);
  const feedRef = useRef<VirtualizedChatFeedRef>(null);

  const handleSelectTocItem = useCallback(
    (groupIndex: number) => {
      const clamped = Math.min(Math.max(groupIndex, 0), groups.length - 1);
      setActiveGroupIndex(clamped);
      feedRef.current?.scrollToIndex(clamped);
    },
    [groups.length],
  );

  const subscribeScroll = useCallback(
    (cb: () => void) => feedRef.current?.subscribeScroll(cb) ?? (() => {}),
    [],
  );

  function send() {
    const text = value.trim();
    if (!text) return;
    setValue('');
  }

  return (
    <div className='relative flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden'>
      <ChatTocSection
        activeGroupIndex={activeGroupIndex}
        onSelectTocItem={handleSelectTocItem}
      />

      <VirtualizedChatFeed
        ref={feedRef}
        groups={groups}
        onActiveGroupIndexChange={setActiveGroupIndex}
      />

      <div className='bg-background shrink-0 px-4 pb-4'>
        <div className='relative mx-auto w-full max-w-[714px]'>
          <div className='pointer-events-none absolute -top-12 left-1/2 -translate-x-1/2'>
            <ScrollToBottomButton
              virtualizerRef={
                feedRef.current?.virtualizerRef ?? { current: null }
              }
              subscribeScroll={subscribeScroll}
              totalCount={groups.length}
            />
          </div>

          <PromptInput
            value={value}
            layout='stacked'
            onSubmit={send}
            onValueChange={setValue}
          >
            <PromptInput.Shell>
              <PromptInput.Content>
                <PromptInput.TextArea placeholder='@ for files/agents; / for commands and skills; ! for shell; # for snippets' />
              </PromptInput.Content>
              <PromptInput.Toolbar>
                <PromptInput.ToolbarEnd>
                  <PromptInput.Send />
                </PromptInput.ToolbarEnd>
              </PromptInput.Toolbar>
            </PromptInput.Shell>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
