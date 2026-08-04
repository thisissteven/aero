import { useVirtualizer } from '@tanstack/react-virtual';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { FloatingToc, PromptInput, ScrollShadow } from '@aero/ui';

import { TocItem } from '@/hooks/api/sessions';

import { ConversationItem, MessageView } from '@/components/message-view';
import { ScrollToBottomButton } from '@/components/scroll-to-bottom';

import type { ChatThread } from '../data/chat';
import type { AeroMessage } from '../../server/services/harness/types';

export interface ChatPageProps {
  thread: ChatThread;
  tocItems?: TocItem[];
}

function groupMessages(messages: AeroMessage[]): ConversationItem[] {
  const groups: ConversationItem[] = [];

  for (const message of messages) {
    const previous = groups.at(-1);

    if (previous?.role === message.role) {
      previous.messages.push(message);
    } else {
      groups.push({
        role: message.role,
        messages: [message],
      });
    }
  }

  return groups;
}

export function ChatPage({ thread, tocItems = [] }: ChatPageProps) {
  const [value, setValue] = useState('');
  const [contentReady, setContentReady] = useState(false);
  const [activeGroupIndex, setActiveGroupIndex] = useState(0);

  const groups = useMemo(
    () => groupMessages(thread.messages),
    [thread.messages],
  );

  const scrollRef = useRef<HTMLDivElement>(null);
  const isAtBottomRef = useRef(true);

  const virtualizer = useVirtualizer({
    count: groups.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: () => 180,
    overscan: 10,
  });

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;

    const threshold = 30;
    const distanceToBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;

    isAtBottomRef.current = distanceToBottom <= threshold;

    const scrollTop = target.scrollTop;

    const visibleItems = virtualizer.getVirtualItems();

    // Find the item currently occupying the top of viewport
    const activeItem = visibleItems.find(
      (item) => item.start <= scrollTop + 20 && item.end >= scrollTop + 20,
    );

    if (activeItem) {
      setActiveGroupIndex(activeItem.index);
    } else if (isAtBottomRef.current && groups.length > 0) {
      // Fallback when scrolled all the way down on initial load
      setActiveGroupIndex(groups.length - 1);
    }
  };

  useLayoutEffect(() => {
    if (!groups.length) return;

    setContentReady(false);

    requestAnimationFrame(() => {
      setContentReady(true);

      requestAnimationFrame(() => {
        virtualizer.measure();

        requestAnimationFrame(() => {
          const targetIndex = groups.length - 1;
          virtualizer.scrollToIndex(targetIndex, {
            align: 'end',
            behavior: 'auto',
          });

          setActiveGroupIndex(targetIndex);
        });
      });
    });
  }, [groups.length]);

  function send() {
    const text = value.trim();
    if (!text) return;

    setValue('');
  }

  const handleSelectTocItem = (index: number) => {
    virtualizer.scrollToIndex(index, {
      align: 'start',
      behavior: 'smooth',
    });
  };

  const getIsActive = (index: number) => {
    const tocItem = tocItems[index];
    const nextTocItem = tocItems[index + 1];

    if (!nextTocItem) {
      return activeGroupIndex >= tocItem.groupIndex;
    }

    return (
      activeGroupIndex >= tocItem.groupIndex &&
      activeGroupIndex < nextTocItem.groupIndex
    );
  };

  return (
    <div className='flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden'>
      <div className='absolute top-1/2 right-6 z-40 -translate-y-1/2'>
        <FloatingToc placement='right' triggerMode='hover'>
          <FloatingToc.Trigger aria-label='Table of contents'>
            {tocItems.map((tocItem, idx) => (
              <FloatingToc.Bar
                key={tocItem.id}
                active={getIsActive(idx)}
                onClick={() => handleSelectTocItem(tocItem.groupIndex)}
              />
            ))}
          </FloatingToc.Trigger>

          <FloatingToc.Content>
            {tocItems.map((tocItem, idx) => (
              <FloatingToc.Item
                key={tocItem.id}
                active={getIsActive(idx)}
                onClick={() => handleSelectTocItem(tocItem.groupIndex)}
              >
                <span className='block max-w-[200px] truncate'>
                  {tocItem.label}
                </span>
              </FloatingToc.Item>
            ))}
          </FloatingToc.Content>
        </FloatingToc>
      </div>

      <div className='relative flex min-h-0 flex-1 flex-col'>
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
            {virtualizer.getVirtualItems().map((virtualItem) => {
              const group = groups[virtualItem.index];

              return (
                <div
                  key={virtualItem.key}
                  ref={virtualizer.measureElement}
                  data-index={virtualItem.index}
                  className='absolute top-0 left-0 w-full pb-8 max-xl:pr-12 max-xl:pl-8'
                  style={{
                    transform: `translateY(${virtualItem.start}px)`,
                  }}
                >
                  <MessageView group={group} hidden={!contentReady} />
                </div>
              );
            })}
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
                <PromptInput.TextArea placeholder='What do you want to know?' />
              </PromptInput.Content>

              <PromptInput.Toolbar>
                <PromptInput.ToolbarEnd>
                  <PromptInput.Send />
                </PromptInput.ToolbarEnd>
              </PromptInput.Toolbar>
            </PromptInput.Shell>

            <PromptInput.Footer className='pt-1'>
              AI can make mistakes. Check important info.
            </PromptInput.Footer>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
