import { cn, IconButton, Typography } from '@aero/ui';
import { Pin, PinFill } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useMemo } from 'react';
import { useSessionRuntime } from '@/app/features/chat-page/chat-feed/chat-store';
import {
  useIsPinned,
  usePinnedMessages,
  useTogglePinnedMessage,
} from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import { useMainChatScrollStore } from '@/app/stores/chat-scroll-store';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function PinnedMessageStatus() {
  const sessionId = useSessionId();

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
  const { data: pinnedMessages } = usePinnedMessages(sessionId);
  const { t } = useI18n();

  const turns = useSessionRuntime(sessionId, (runtime) => runtime.turns);

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
        (turn.role === 'assistant'
          ? t.statusPanel.assistantText
          : t.statusPanel.emptyUserText),
      createdAt: turn.createdAt,
    }));
  }, [turns, t]);

  // Map and sort pinned messages by turn index (chronological order).
  const orderedPinnedTurns = useMemo(() => {
    const pinnedIds = new Set(pinnedMessages?.map((m) => m.id) ?? []);

    return userTurns
      .filter((turn) => pinnedIds.has(turn.id))
      .sort((a, b) => a.index - b.index);
  }, [pinnedMessages, userTurns]);

  if (orderedPinnedTurns.length === 0) {
    return null;
  }

  return (
    <div className='border-b-separator border-b py-3'>
      <div className='mb-2.5 flex items-center gap-1 px-3'>
        <Icon data={Pin} className='text-muted' size={14} />
        <Typography type='body-sm' className='text-foreground font-medium'>
          {t.statusPanel.pinnedMessages}
        </Typography>
      </div>

      <div className='flex flex-col gap-1.5 pr-3 pl-2'>
        {orderedPinnedTurns.map((turn) => (
          <div key={turn.id} className='flex items-center gap-1'>
            <MessageActionsPin messageId={turn.id} />
            <Typography
              type='body-xs'
              className='text-muted hover:text-foreground cursor-pointer truncate transition-colors hover:underline'
              onClick={() => {
                useMainChatScrollStore.getState().scrollToIndex(turn.index);
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
  const sessionId = useSessionId();
  const pinned = useIsPinned(sessionId, messageId);
  const { mutate: toggle } = useTogglePinnedMessage();

  return (
    <IconButton
      onPress={() => toggle({ sessionId, messageId, pinned: !pinned })}
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
