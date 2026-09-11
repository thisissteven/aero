import { Pin, PinFill } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useParams } from '@tanstack/react-router';
import { useMemo } from 'react';

import { cn, Typography } from '@aero/ui';

import { IconButton } from '@/app/components/ui/icon-button';
import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { useSessionPinnedMessages } from '@/app/hooks/api/sessions';
import {
  usePinnedSessionMessage,
  useUpdateSetting,
} from '@/app/hooks/api/settings';
import { useChatScrollStore } from '@/app/stores/chat-scroll-store';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function PinnedMessageStatus() {
  const { sessionId } = useParams({ strict: false });

  const isVisible = useStatusPanelStore(
    (state) => state.visibleItems.pinnedMessage,
  );

  if (!isVisible || !sessionId) return null;

  return <PinnedMessageStatusContent sessionId={sessionId} />;
}

export function PinnedMessageStatusContent({
  sessionId,
}: {
  sessionId: string;
}) {
  const { data: pinnedSessionMessages } = useSessionPinnedMessages(sessionId);

  const turns = useChatStore((state) => state.activeSession.turns);

  const userTurns = useMemo(() => {
    return turns.map((turn, index) => ({
      id: turn.id,
      index,
      text:
        turn.parts
          .map((part) => (part.type === 'text' ? part.text : ''))
          .filter(Boolean)
          .join(' ')
          .trim() ||
        (turn.role === 'assistant' ? 'Assistant text' : 'Empty user text'),
      createdAt: turn.createdAt,
    }));
  }, [turns]);

  // Map and sort pinned messages by turn index (chronological order)
  const orderedPinnedTurns = useMemo(() => {
    const pinnedEntries = Object.entries(pinnedSessionMessages ?? {}).filter(
      ([_, isPinned]) => Boolean(isPinned),
    );

    return pinnedEntries
      .map(([messageId]) => userTurns.find((t) => t.id === messageId))
      .filter((turn): turn is NonNullable<typeof turn> => Boolean(turn))
      .sort((a, b) => a.index - b.index);
  }, [pinnedSessionMessages, userTurns]);

  if (orderedPinnedTurns.length === 0) {
    return null;
  }

  return (
    <div className='border-b-separator border-b py-3'>
      {/* Title Header */}
      <div className='mb-2.5 flex items-center gap-1 px-3'>
        <Icon data={Pin} className='text-muted' size={14} />
        <Typography type='body-sm' className='text-foreground font-medium'>
          Pinned messages
        </Typography>
      </div>

      {/* Pinned Items */}
      <div className='flex flex-col gap-1.5 pr-3 pl-2'>
        {orderedPinnedTurns.map((turn) => (
          <div key={turn.id} className='flex items-center gap-1'>
            <MessageActionsPin messageId={turn.id} />
            <Typography
              type='body-xs'
              className='text-muted hover:text-foreground cursor-pointer truncate transition-colors hover:underline'
              onClick={() => {
                useChatScrollStore.getState().scrollToIndex(turn.index);
              }}
            >
              {turn.text}
            </Typography>
          </div>
        ))}
      </div>
    </div>
  );
}

function MessageActionsPin({ messageId }: { messageId: string }) {
  const { sessionId } = useParams({ strict: false });
  const { data } = usePinnedSessionMessage(sessionId, messageId);
  const { mutateAsync: updateSetting } = useUpdateSetting();

  const pinned = data?.value ?? false;

  return (
    <IconButton
      onPress={() => {
        updateSetting({
          path: ['pinnedSessionMessages', sessionId, messageId],
          value: !pinned,
        });
      }}
      size='xs'
      svgSize='xs'
      className='size-6 shrink-0'
    >
      <Icon
        data={pinned ? PinFill : Pin}
        className={cn(pinned && 'text-accent')}
      />
    </IconButton>
  );
}
