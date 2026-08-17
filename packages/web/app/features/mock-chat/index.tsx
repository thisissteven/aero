import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
  useState,
} from 'react';
import { type VirtualizerHandle } from 'virtua';

import { cn, ScrollShadow } from '@aero/ui';
import { useAutoScroll } from '@aero/ui/hooks';

import { ChatConversationView } from '@/app/components/message-view/chat-conversation-view';
import { useScrollbarWidth } from '@/app/hooks/useScrollbarWidth';
import { AeroConversationTurn } from '@/server/services/harness/types';

import { useMockStreamFeed } from './useMockStreamFeed';

export interface MockChatPageRef {
  virtualizerRef: React.RefObject<VirtualizerHandle | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  subscribeScroll: (cb: () => void) => () => void;
  scrollToIndex: (index: number) => void;
}

export const MockChatPage = forwardRef<
  MockChatPageRef,
  { mockGroups: AeroConversationTurn[] }
>(function MockChatPage({ mockGroups }, ref) {
  const virtualizerRef = useRef<VirtualizerHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const listenersRef = useRef<Set<() => void>>(new Set());

  const [ready, setReady] = useState(false);

  // 1. Stream feed hook
  const { displayedGroups, isStreaming } = useMockStreamFeed(mockGroups, true);

  const scrollbarWidth = useScrollbarWidth(scrollRef);

  // 2. Drive auto-scrolling via hook
  useAutoScroll({
    scrollRef,
    contentRef,
    isStreaming,
  });

  // 3. Scroll event subscription for ScrollToBottomButton
  const subscribeScroll = useCallback((cb: () => void) => {
    listenersRef.current.add(cb);
    return () => {
      listenersRef.current.delete(cb);
    };
  }, []);

  useEffect(() => {
    const scrollEl = scrollRef.current;
    if (!scrollEl) return;

    const handleScroll = () => {
      listenersRef.current.forEach((cb) => cb());
    };

    scrollEl.addEventListener('scroll', handleScroll, { passive: true });
    return () => scrollEl.removeEventListener('scroll', handleScroll);
  }, []);

  // 4. Expose ref interface to parent
  useImperativeHandle(
    ref,
    () => ({
      virtualizerRef,
      scrollRef,
      subscribeScroll,
      scrollToIndex: (index: number) => {
        virtualizerRef.current?.scrollToIndex(index, {
          align: 'end',
          smooth: true,
        });
      },
    }),
    [subscribeScroll],
  );

  useLayoutEffect(() => {
    if (displayedGroups.length && !ready) {
      setReady(true);
    }
  }, [displayedGroups.length, ready]);

  return (
    <div
      className={cn(
        'relative flex min-h-0 flex-1 flex-col transition',
        ready ? 'opacity-100' : 'opacity-0',
      )}
      style={{ paddingLeft: `${scrollbarWidth}px` }}
    >
      <ScrollShadow
        ref={scrollRef}
        className='min-h-0 flex-1 scrollbar-thin scrollbar-gutter-stable overflow-y-auto pt-10'
      >
        <div ref={contentRef} className='pb-4'>
          <ChatConversationView
            displayedGroups={displayedGroups}
            isStreaming={isStreaming}
            scrollRef={scrollRef}
            virtualizerRef={virtualizerRef}
          />
        </div>
      </ScrollShadow>
    </div>
  );
});
