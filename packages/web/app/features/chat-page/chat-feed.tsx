import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { type VirtualizerHandle } from 'virtua';

import { cn, ScrollShadow } from '@aero/ui';
import { useAutoScroll } from '@aero/ui/hooks';

import { ChatConversationView } from '@/app/components/message-view/chat-conversation-view';
import { buildFlatConversationItems } from '@/app/components/message-view/lib';
import { useScrollbarWidth } from '@/app/hooks/useScrollbarWidth';
import { AeroConversationTurn } from '@/server/services/harness/types';

export interface ChatFeedRef {
  scrollToIndex: (index: number) => void;
  virtualizerRef: React.RefObject<VirtualizerHandle | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  subscribeScroll: (cb: () => void) => () => void;
}

export const ChatFeed = forwardRef<
  ChatFeedRef,
  {
    groups: AeroConversationTurn[];
    onActiveGroupIndexChange: (index: number) => void;
  }
>(function ChatFeed({ groups, onActiveGroupIndexChange }, ref) {
  const virtualizerRef = useRef<VirtualizerHandle>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const listenersRef = useRef<Set<() => void>>(new Set());

  const [ready, setReady] = useState(false);

  const scrollbarWidth = useScrollbarWidth(scrollRef);

  // Single source of truth for the turn(group) <-> flat item index mapping.
  // NOTE: isStreaming is still hardcoded false here, same as before — flag if
  // this ChatFeed instance is ever meant to render live streaming turns.
  const { flatItems, groupFlatIndex } = useMemo(
    () => buildFlatConversationItems(groups, false),
    [groups],
  );

  useAutoScroll({
    scrollRef,
    contentRef,
    isStreaming: false,
  });

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

  useImperativeHandle(
    ref,
    () => ({
      virtualizerRef,
      scrollRef,
      subscribeScroll,
      scrollToIndex: (groupIndex: number) => {
        const flatIndex = groupFlatIndex[groupIndex];
        if (flatIndex === undefined) return;
        virtualizerRef.current?.scrollToIndex(flatIndex, {
          align: 'start', // jump so the target bubble lands near the top
          smooth: true,
        });
      },
    }),
    [subscribeScroll, groupFlatIndex],
  );

  useLayoutEffect(() => {
    if (groups.length && !ready) {
      setReady(true);
    }
  }, [groups.length, ready]);

  // Explicit initial scroll-to-latest, independent of useAutoScroll.
  // If useAutoScroll doesn't fire reliably on first mount (e.g. it's gated on
  // isStreaming transitions or a mutation it never observes at mount time),
  // this guarantees the feed opens at the bottom.
  useLayoutEffect(() => {
    if (!ready || !flatItems.length) return;
    const raf = requestAnimationFrame(() => {
      virtualizerRef.current?.scrollToIndex(flatItems.length - 1, {
        align: 'end',
      });
    });
    return () => cancelAnimationFrame(raf);
  }, [ready]);

  const scrollRafRef = useRef<number | null>(null);
  const isProgrammaticScrollRef = useRef(false);

  // TOC anchors: (groupIndex, flatIndex) pairs for user turns only, sorted
  // ascending — used to resolve "which user turn is active" from a flat
  // scroll offset.
  const userTocAnchors = useMemo(
    () =>
      groups.reduce<{ groupIndex: number; flatIndex: number }[]>(
        (acc, group, index) => {
          if (group.role === 'user') {
            acc.push({ groupIndex: index, flatIndex: groupFlatIndex[index]! });
          }
          return acc;
        },
        [],
      ),
    [groups, groupFlatIndex],
  );

  const resolveActiveIndex = useCallback(
    (flatIndex: number) => {
      const arr = userTocAnchors;
      if (arr.length === 0) return 0;
      let lo = 0;
      let hi = arr.length - 1;
      let result = arr[0]!.groupIndex;
      while (lo <= hi) {
        const mid = (lo + hi) >> 1;
        const anchor = arr[mid]!;
        if (anchor.flatIndex <= flatIndex) {
          result = anchor.groupIndex;
          lo = mid + 1;
        } else {
          hi = mid - 1;
        }
      }
      return result;
    },
    [userTocAnchors],
  );

  const resolveActiveIndexRef = useRef(resolveActiveIndex);
  useEffect(() => {
    resolveActiveIndexRef.current = resolveActiveIndex;
  }, [resolveActiveIndex]);

  const handleScroll = useCallback(
    (offset: number) => {
      listenersRef.current.forEach((cb) => cb());

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
        className='min-h-0 flex-1 scrollbar-thin scrollbar-gutter-stable overflow-y-auto'
      >
        <div ref={contentRef} className='pb-4'>
          <ChatConversationView
            virtualizerRef={virtualizerRef}
            scrollRef={scrollRef}
            flatItems={flatItems}
            onScroll={handleScroll}
          />
        </div>
      </ScrollShadow>
    </div>
  );
});
