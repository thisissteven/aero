import { useVirtualizer } from '@tanstack/react-virtual';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';

import { PromptInput, ScrollShadow } from '@aero/ui';

import { ConversationItem, MessageView } from '@/components/message-view';
import { ScrollToBottomButton } from '@/components/scroll-to-bottom';

import type { ChatThread } from '../data/chat';
import type { AeroMessage } from '../../server/services/harness/types';

export interface ChatPageProps {
  thread: ChatThread;
}

export function groupMessages(messages: AeroMessage[]): ConversationItem[] {
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

export function ChatPage({ thread }: ChatPageProps) {
  const [value, setValue] = useState('');
  const [contentReady, setContentReady] = useState(false);

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

  // Track scroll position to determine if the user is pinned to the bottom
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const threshold = 30; // pixels from the bottom
    const distanceToBottom =
      target.scrollHeight - target.scrollTop - target.clientHeight;
    isAtBottomRef.current = distanceToBottom <= threshold;
  };

  // Enforce stick-to-bottom positioning during active incoming streaming data
  useLayoutEffect(() => {
    if (!groups.length) return;

    setContentReady(false);

    requestAnimationFrame(() => {
      setContentReady(true);

      requestAnimationFrame(() => {
        virtualizer.measure();

        requestAnimationFrame(() => {
          virtualizer.scrollToIndex(groups.length - 1, {
            align: 'end',
            behavior: 'auto',
          });
        });
      });
    });
  }, [groups.length]);

  function send() {
    const text = value.trim();
    if (!text) return;

    setValue('');
    // call your API here
  }

  return (
    <div className='flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden'>
      <div className='relative flex min-h-0 flex-1 flex-col'>
        <ScrollShadow
          ref={scrollRef}
          onScroll={handleScroll}
          className='min-h-0 flex-1 scrollbar-thin overflow-y-auto overscroll-contain pt-10'
        >
          <div
            className='relative mx-auto w-full max-w-[800px] px-4'
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
                  className='absolute top-0 left-0 w-full pb-8' // Padding moved to layout anchor
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
