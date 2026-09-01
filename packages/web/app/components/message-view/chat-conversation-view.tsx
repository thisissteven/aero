import { useMemo } from 'react';
import { Virtualizer, VirtualizerHandle } from 'virtua';

import { FlatItem } from '@/app/components/message-view/unused/streaming-demo/streaming-demo-types';
import { useKeepMountedStoreFeed } from '@/app/stores/keep-mounted';

import { AssistantFooterView } from './assistant-footer-view';
import { AssistantPartView } from './assistant-part-view';
import { UserChatBubble } from './user-chat-bubble';

export function ChatConversationView({
  flatItems,
  virtualizerRef,
  scrollRef,
  onScroll,
}: {
  flatItems: FlatItem[];
  virtualizerRef: React.RefObject<VirtualizerHandle | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (offset: number) => void;
}) {
  const keepIds = useKeepMountedStoreFeed((s) => s.ids);

  const keepMounted = useMemo(() => {
    const idToIndex = new Map(flatItems.map((item, i) => [item.id, i]));
    const out: number[] = [];
    for (const id in keepIds) {
      const idx = idToIndex.get(id);
      if (idx !== undefined) out.push(idx);
    }
    return out;
  }, [keepIds, flatItems]);

  return (
    <Virtualizer<FlatItem>
      ref={virtualizerRef}
      scrollRef={scrollRef}
      keepMounted={keepMounted}
      data={flatItems}
      onScroll={onScroll}
      bufferSize={1000}
      // set shift = true if loading older messages, shift = false if streaming
      // shift={isStreaming ? false : true}
    >
      {(item) => {
        if (item.type === 'user-spacer') {
          return <div key={item.id} className='h-8 w-full shrink-0' />;
        }

        return (
          <div
            key={item.id}
            className='mx-auto w-full px-3 [contain:layout_style] md:max-w-[720px]'
          >
            {item.type === 'user' && (
              <UserChatBubble
                turn={item.turn}
                forkMessageId={item.forkMessageId}
              />
            )}
            {item.type === 'assistant-part' && (
              <AssistantPartView
                part={item.part}
                partId={item.partId}
                isPartStreaming={item.isPartStreaming}
              />
            )}
            {item.type === 'assistant-error' &&
              item.errorType === 'message_aborted' && (
                <div className='relative pt-4'>
                  <div className='absolute top-0 left-0 h-full pt-4'>
                    <div className='bg-danger h-full w-1'></div>
                  </div>
                  <div className='text-danger bg-danger-soft border-danger-soft/50 w-fit rounded-r-lg border px-4 py-2 text-sm'>
                    {item.message}
                  </div>
                </div>
              )}
            {item.type === 'assistant-error' &&
              item.errorType === 'usage_exceeded' && (
                <div className='relative pt-2'>
                  <div className='absolute top-0 left-0 h-full pt-2'>
                    <div className='bg-warning h-full w-1'></div>
                  </div>
                  <div className='text-warning bg-warning-soft border-warning-soft/50 w-fit rounded-r-lg border px-4 py-2 text-sm'>
                    <div>
                      <b>Usage Exceeded Error</b>
                    </div>
                    {item.message}
                  </div>
                </div>
              )}
            {item.type === 'assistant-footer' && (
              <AssistantFooterView item={item} />
            )}
          </div>
        );
      }}
    </Virtualizer>
  );
}
