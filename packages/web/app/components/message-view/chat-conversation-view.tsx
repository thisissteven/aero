import { useMemo } from 'react';
import { Virtualizer, VirtualizerHandle } from 'virtua';

import { FlatConversationVirtualItem } from '@/app/components/message-view/lib';
import { formatDateTime } from '@/app/lib/date';
import { useKeepMountedStore } from '@/app/stores/keep-mounted';
import { AeroConversationTurn } from '@/server/services/harness/types';

import { AssistantFooterView } from './assistant-footer-view';
import { AssistantPartView } from './assistant-part-view';
import { UserChatBubble } from './user-chat-bubble';

export function ChatConversationView({
  displayedGroups,
  isStreaming,
  virtualizerRef,
  scrollRef,
}: {
  displayedGroups: AeroConversationTurn[];
  isStreaming: boolean;
  virtualizerRef: React.RefObject<VirtualizerHandle | null>;
  scrollRef: React.RefObject<HTMLDivElement | null>;
}) {
  const flatItems = useMemo<FlatConversationVirtualItem[]>(() => {
    const items: FlatConversationVirtualItem[] = [];

    displayedGroups.forEach((turn, turnIndex) => {
      const isLastTurn = turnIndex === displayedGroups.length - 1;
      const isTurnStreaming = isStreaming && isLastTurn;

      if (turn.role === 'user') {
        items.push({
          id: turn.id,
          type: 'user',
          turn,
        });

        items.push({
          id: `${turn.id}-spacer`,
          type: 'spacer',
        });
      } else {
        const assistantTextResponse = turn.parts
          .filter((p) => p.type === 'text')
          .map((p) => p.text.trim())
          .filter(Boolean)
          .join('\n\n')
          .replace(/\n{3,}/g, '\n\n')
          .trim();

        const hasFooter = !isTurnStreaming;

        turn.parts.forEach((part, partIndex) => {
          const isLastPartInTurn = partIndex === turn.parts.length - 1;
          const isPartStreaming = isTurnStreaming && isLastPartInTurn;

          // Filter part kosong yang tidak sedang streaming
          if (part.type === 'text' && !part.text?.trim() && !isPartStreaming)
            return;
          if (
            part.type === 'reasoning' &&
            !part.text?.trim() &&
            !isPartStreaming
          )
            return;

          items.push({
            id: `${turn.id}-part-${partIndex}`,
            type: 'assistant-part',
            turnId: turn.id,
            part,
            partIndex,
            isPartStreaming,
            isLastPartInTurn,
          });
        });

        if (hasFooter) {
          items.push({
            id: `${turn.id}-footer`,
            type: 'assistant-footer',
            turnId: turn.id,
            createdAt: formatDateTime(turn.createdAt),
            assistantTextResponse,
          });
        }
      }
    });

    return items;
  }, [displayedGroups, isStreaming]);

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
      // shift={true}
    >
      {(item) => {
        if (item.type === 'spacer') {
          return <div key={item.id} className='h-10 w-full shrink-0' />;
        }

        return (
          <div key={item.id} className='mx-auto w-full px-3 md:max-w-[720px]'>
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
