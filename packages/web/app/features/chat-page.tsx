import { useVirtualizer } from '@tanstack/react-virtual';
import React, { useCallback, useMemo, useRef, useState } from 'react';

import { FloatingToc, PromptInput, ScrollShadow } from '@aero/ui';

import { MessageView } from '@/app/components/message-view';
import { ChatThread } from '@/app/data/chat';
import { useSessionToc } from '@/app/hooks/api/sessions';
import { getTurnEstimateSize } from '@/app/lib';
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

  const activeTocIndex = tocItems.reduce(
    (acc, item, index) => (item.groupIndex <= activeGroupIndex ? index : acc),
    -1,
  );

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
// 3. Virtualized Feed
// ============================================================================
export interface VirtualizedChatFeedRef {
  scrollToIndex: (index: number) => void;
}

const ChatMessageItem = React.memo(function ChatMessageItem({
  turn,
}: {
  turn: ChatThread['turns'][number];
}) {
  return <MessageView turn={turn} />;
});

const VirtualizedChatFeed = React.memo(
  React.forwardRef<
    VirtualizedChatFeedRef,
    {
      groups: ChatThread['turns'];
      onActiveGroupIndexChange: (index: number) => void;
    }
  >(function VirtualizedChatFeed({ groups, onActiveGroupIndexChange }, ref) {
    const scrollRef = useRef<HTMLDivElement>(null);
    const didInitialScroll = useRef(false);
    const containerWidthRef = useRef(600);

    const userGroupIndexes = useMemo(
      () =>
        groups.reduce<number[]>((acc, group, index) => {
          if (group.role === 'user') acc.push(index);
          return acc;
        }, []),
      [groups],
    );

    // Snaps any raw index to the nearest preceding user-turn index. This is
    // the ONE place "active group" gets computed — scroll-driven and
    // click-driven (TOC) selection both funnel through here so they can
    // never disagree with each other.
    const resolveActiveIndex = useCallback(
      (index: number) => {
        let resolved = userGroupIndexes[0] ?? 0;
        for (const userIndex of userGroupIndexes) {
          if (userIndex > index) break;
          resolved = userIndex;
        }
        return resolved;
      },
      [userGroupIndexes],
    );

    const virtualizer = useVirtualizer({
      count: groups.length,
      getScrollElement: () => scrollRef.current,
      estimateSize: (index) =>
        getTurnEstimateSize(groups[index], containerWidthRef.current),
      getItemKey: useCallback(
        (index: number) => groups[index]?.id ?? index,
        [groups],
      ),
      anchorTo: 'end',
      followOnAppend: true,
      scrollEndThreshold: 80,
      overscan: 6,
      directDomUpdates: true,
    });

    const virtualItems = virtualizer.getVirtualItems();

    React.useImperativeHandle(
      ref,
      () => ({
        scrollToIndex(index) {
          virtualizer.scrollToIndex(index, {
            align: 'start',
            behavior: 'auto',
          });
        },
      }),
      [virtualizer],
    );

    React.useLayoutEffect(() => {
      if (didInitialScroll.current) return;
      if (scrollRef.current) {
        containerWidthRef.current =
          scrollRef.current.clientWidth || containerWidthRef.current;
      }
      virtualizer.scrollToEnd();
      didInitialScroll.current = true;
    }, [virtualizer]);

    return (
      <div className='relative flex min-h-0 flex-1 flex-col pr-1'>
        <ScrollShadow
          ref={scrollRef}
          onScroll={() => {
            // range.startIndex is the actual visible range, unlike
            // getVirtualItems()[0] which includes overscan and fires the
            // "active" update several rows before the item is on screen.
            const startIndex = virtualizer.range?.startIndex;
            if (startIndex != null) {
              onActiveGroupIndexChange(resolveActiveIndex(startIndex));
            }
          }}
          className='min-h-0 flex-1 scrollbar-thin overflow-y-auto overscroll-contain pt-10'
        >
          <div
            ref={virtualizer.containerRef}
            className='relative mx-auto w-full xl:max-w-[800px]'
          >
            {virtualItems.map((virtualItem) => (
              <div
                key={virtualItem.key}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
                className='absolute top-0 left-0 w-full pb-8 max-xl:pr-12 max-xl:pl-8'
              >
                <ChatMessageItem turn={groups[virtualItem.index]} />
              </div>
            ))}
          </div>
        </ScrollShadow>
      </div>
    );
  }),
);

// ============================================================================
// 4. Main Chat Page
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
      feedRef.current?.scrollToIndex(clamped);
      // No separate "set active" call — scrolling triggers a real onScroll
      // in VirtualizedChatFeed, which resolves and reports the active
      // index through the same path a manual scroll would. One writer.
    },
    [groups.length],
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
