import { useMemo } from 'react';
import { Virtualizer, VirtualizerHandle } from 'virtua';

import { FlatConversationVirtualItem } from '@/app/components/message-view/lib';
import { useKeepMountedStore } from '@/app/stores/keep-mounted';

import { AssistantFooterView } from './assistant-footer-view';
import { AssistantPartView } from './assistant-part-view';
import { UserChatBubble } from './user-chat-bubble';

export function ChatConversationView({
  flatItems,
  virtualizerRef,
  scrollRef,
  onScroll,
}: {
  flatItems: FlatConversationVirtualItem[];
  virtualizerRef: React.RefObject<VirtualizerHandle | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
  onScroll: (offset: number) => void;
}) {
  const keepIds = useKeepMountedStore((s) => s.ids);

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
    <Virtualizer<FlatConversationVirtualItem>
      ref={virtualizerRef}
      scrollRef={scrollRef}
      data={flatItems}
      keepMounted={keepMounted}
      onScroll={onScroll}
      // set shift = true if loading older messages, shift = false if streaming
      // shift={isStreaming ? false : true}
    >
      {(item) => {
        if (item.type === 'spacer-first-item') {
          return <div key={item.id} className='h-10 w-full shrink-0' />;
        }
        if (item.type === 'spacer') {
          return <div key={item.id} className='h-2 w-full shrink-0' />;
        }
        if (item.type === 'spacer-footer') {
          return <div key={item.id} className='h-8 w-full shrink-0' />;
        }
        return (
          <div
            key={item.id}
            className='mx-auto w-full px-3 [contain:layout_style] md:max-w-[720px]'
          >
            {item.type === 'user' && <UserChatBubble turn={item.turn} />}
            {item.type === 'assistant-part' && (
              <AssistantPartView
                turnId={item.turnId}
                part={item.part}
                partIndex={item.partIndex}
                isPartStreaming={item.isPartStreaming}
              />
            )}
            {item.type === 'assistant-footer' && (
              <AssistantFooterView
                turnId={item.turnId}
                createdAt={item.createdAt}
                assistantTextResponse={item.assistantTextResponse}
              />
            )}
          </div>
        );
      }}
    </Virtualizer>
  );
}
