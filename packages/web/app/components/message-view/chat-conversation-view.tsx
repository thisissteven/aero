import { Virtualizer, VirtualizerHandle } from 'virtua';

import { FlatConversationVirtualItem } from '@/app/components/message-view/lib';

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
  return (
    <Virtualizer<FlatConversationVirtualItem>
      ref={virtualizerRef}
      scrollRef={scrollRef}
      data={flatItems}
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
            {item.type === 'user' && (
              <UserChatBubble
                turn={item.turn}
                forkMessageId={item.forkMessageId}
              />
            )}
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
                nextTurnId={item.nextTurnId}
              />
            )}
          </div>
        );
      }}
    </Virtualizer>
  );
}
