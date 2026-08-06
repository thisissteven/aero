import { useVirtualizer } from '@tanstack/react-virtual';
import React, {
  useCallback,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { FloatingToc, PromptInput, ScrollShadow } from '@aero/ui';

import { getTurnEstimateSize } from '@/lib';
import { useSessionToc } from '@/hooks/api/sessions';

import { useTocStore } from '@/data/toc-store';

import { MessageView } from '@/components/message-view';
import { ScrollToBottomButton } from '@/components/scroll-to-bottom';

import { Route } from '@/routes/_app/sessions/$sessionId';

import type { ChatThread } from '../data/chat';
import { AeroConversationTurn } from '../../server/services/harness/types';

// ============================================================================
// 1. TOC Component
// ============================================================================
const ChatTocSection = React.memo(function ChatTocSection({
  onSelectTocItem,
}: {
  onSelectTocItem: (groupIndex: number) => void;
}) {
  const { sessionId } = Route.useParams();
  const { data: tocItems = [] } = useSessionToc(undefined, sessionId);

  const activeGroupIndex = useTocStore((state) => state.activeGroupIndex);

  const activeTocIndex = tocItems.reduce(
    (acc, item, index) => (item.groupIndex <= activeGroupIndex ? index : acc),
    -1,
  );

  console.log('render toc', activeGroupIndex, activeTocIndex);

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
// 2. Message Item
// ============================================================================
const ChatMessageItem = React.memo(function ChatMessageItem({
  turn,
}: {
  turn: ChatThread['turns'][number];
}) {
  return <MessageView turn={turn} />;
});

// ============================================================================
// 3. Virtualized Feed
// ============================================================================
export interface VirtualizedChatFeedRef {
  scrollToIndex: (index: number) => void;
}

const VirtualizedChatFeed = React.memo(
  React.forwardRef<VirtualizedChatFeedRef, { groups: ChatThread['turns'] }>(
    function VirtualizedChatFeed({ groups }, ref) {
      const scrollRef = useRef<HTMLDivElement>(null);
      const isAtBottomRef = useRef(true);
      const frameRef = useRef<number | null>(null);
      const activeUserGroupRef = useRef<number | null>(null);

      const setActiveGroupIndex = useTocStore(
        (state) => state.setActiveGroupIndex,
      );

      const userGroupIndexes = useMemo(
        () =>
          groups
            .map((group, index) => (group.role === 'user' ? index : -1))
            .filter((index) => index !== -1),
        [groups],
      );

      const updateActiveUserGroup = useCallback(
        (index: number) => {
          let activeUserIndex: number | null = null;

          for (const userIndex of userGroupIndexes) {
            if (userIndex > index) break;
            activeUserIndex = userIndex;
          }

          if (
            activeUserIndex !== null &&
            activeUserGroupRef.current !== activeUserIndex
          ) {
            activeUserGroupRef.current = activeUserIndex;
            setActiveGroupIndex(activeUserIndex);
          }
        },
        [userGroupIndexes, setActiveGroupIndex],
      );

      const getItemKey = useCallback(
        (index: number) => groups[index]?.id ?? index,
        [groups],
      );

      const virtualizer = useVirtualizer({
        count: groups.length,
        getScrollElement: () => scrollRef.current,
        estimateSize: (index) => getTurnEstimateSize(groups[index]),
        getItemKey,
        anchorTo: 'end',
        followOnAppend: true,
        scrollEndThreshold: 80,
        overscan: 5,
      });

      React.useImperativeHandle(
        ref,
        () => ({
          scrollToIndex(index) {
            queueMicrotask(() => {
              virtualizer.scrollToIndex(index, {
                align: 'start',
                behavior: 'instant',
              });
            });
          },
        }),
        [virtualizer],
      );

      const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const target = e.currentTarget;

        if (frameRef.current !== null) {
          cancelAnimationFrame(frameRef.current);
        }

        frameRef.current = requestAnimationFrame(() => {
          const distanceToBottom =
            target.scrollHeight - target.scrollTop - target.clientHeight;

          isAtBottomRef.current = distanceToBottom <= 30;

          const visibleItems = virtualizer.getVirtualItems();

          const activeItem = visibleItems.find(
            (item) =>
              item.start <= target.scrollTop + 20 &&
              item.end >= target.scrollTop + 20,
          );

          if (activeItem) {
            updateActiveUserGroup(activeItem.index);
          } else if (isAtBottomRef.current && groups.length) {
            updateActiveUserGroup(groups.length - 1);
          }
        });
      };

      const didInitialScroll = useRef(false);

      useLayoutEffect(() => {
        if (!groups.length || didInitialScroll.current) return;

        didInitialScroll.current = true;

        const rafId = requestAnimationFrame(() => {
          virtualizer.scrollToEnd();
          updateActiveUserGroup(groups.length - 1);
        });

        return () => cancelAnimationFrame(rafId);
      }, [groups.length, virtualizer, updateActiveUserGroup]);

      useLayoutEffect(() => {
        return () => {
          if (frameRef.current !== null) {
            cancelAnimationFrame(frameRef.current);
          }
        };
      }, []);

      return (
        <div className='relative flex min-h-0 flex-1 flex-col pr-1'>
          <ScrollShadow
            ref={scrollRef}
            onScroll={handleScroll}
            className='min-h-0 flex-1 scrollbar-thin overflow-y-auto overscroll-contain pt-10'
          >
            <div
              className='relative mx-auto w-full xl:max-w-[800px]'
              style={{
                height: `${virtualizer.getTotalSize()}px`,
              }}
            >
              {virtualizer.getVirtualItems().map((virtualItem) => (
                <div
                  key={virtualItem.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  className='absolute top-0 left-0 w-full pb-8 max-xl:pr-12 max-xl:pl-8'
                  style={{
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <ChatMessageItem turn={groups[virtualItem.index]} />
                </div>
              ))}
            </div>
          </ScrollShadow>

          <div className='pointer-events-none absolute bottom-4 left-1/2 z-30 -translate-x-1/2'>
            <div className='pointer-events-auto'>
              <ScrollToBottomButton
                virtualizer={virtualizer}
                totalCount={groups.length}
              />
            </div>
          </div>
        </div>
      );
    },
  ),
);

// ============================================================================
// 4. Main Chat Page
// ============================================================================
export interface ChatPageProps {
  groups: AeroConversationTurn[];
}

export function ChatPage({ groups }: ChatPageProps) {
  const [value, setValue] = useState('');

  const setActiveGroupIndex = useTocStore((state) => state.setActiveGroupIndex);

  const feedRef = useRef<VirtualizedChatFeedRef>(null);

  const handleSelectTocItem = useCallback(
    (groupIndex: number) => {
      feedRef.current?.scrollToIndex(groupIndex);
      setActiveGroupIndex(groupIndex);
    },
    [setActiveGroupIndex],
  );

  function send() {
    const text = value.trim();

    if (!text) return;

    setValue('');
  }

  return (
    <div className='relative flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden'>
      <ChatTocSection onSelectTocItem={handleSelectTocItem} />

      <VirtualizedChatFeed ref={feedRef} groups={groups} />

      <div className='bg-background shrink-0 px-4 pb-4'>
        <div className='mx-auto w-full max-w-[714px]'>
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
