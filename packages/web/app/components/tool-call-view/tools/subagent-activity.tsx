import { Button, Skeleton } from '@aero/ui';
import { ArrowUpRightFromSquare } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useMemo } from 'react';

import { useSideChatStore } from '@/app/components/chat-aside/side-chat/side-chat-store';
import { AssistantPartView } from '@/app/components/message-view/assistant-part-view';
import type { FlatConversationVirtualItem } from '@/app/components/message-view/lib';
import { useSessionRuntime } from '@/app/features/chat-page/chat-feed/chat-store';
import { useSubagentStream } from '@/app/hooks/api/use-subagent-stream';
import { useI18n } from '@/app/hooks/i18n';
import { useSidePanelStore } from '@/app/stores/side-panel-store';

const MAX_ACTIVITY = 5;

type AssistantPartItem = Extract<
  FlatConversationVirtualItem,
  { type: 'assistant-part' }
>;

export function SubagentActivity({ sessionId }: { sessionId: string }) {
  const { t } = useI18n();

  const { isMessagesLoading } = useSubagentStream(sessionId, true);

  const runtime = useSessionRuntime(sessionId, (state) => state);

  const activity = useMemo(
    () =>
      runtime.flatItems
        .filter((item): item is AssistantPartItem => {
          return item.type === 'assistant-part';
        })
        .slice(-MAX_ACTIVITY),
    [runtime.flatItems],
  );

  const isLoading = isMessagesLoading || !runtime.hasHydrated;

  return (
    <div className='space-y-1.5'>
      <div className='flex items-center justify-between gap-2'>
        <span className='text-muted text-xs'>
          {t.toolCall.subagentActivity}
        </span>

        <Button
          size='sm'
          variant='tertiary'
          onPress={() => {
            useSideChatStore.getState().setSessionId(sessionId);
            useSidePanelStore.getState().setActiveNavItem('side-chat');
            useSidePanelStore.getState().setIsOpen(true);
          }}
          className='rounded-lg'
        >
          <Icon data={ArrowUpRightFromSquare} size={12} />
          {t.toolCall.openSubagent}
        </Button>
      </div>

      {isLoading && activity.length === 0 ? (
        <div className='space-y-1.5 py-1'>
          <Skeleton className='h-4 w-3/4 rounded' />
          <Skeleton className='h-4 w-1/2 rounded' />
          <Skeleton className='h-4 w-2/3 rounded' />
        </div>
      ) : activity.length === 0 ? (
        <p className='text-muted py-1 text-xs'>{t.toolCall.noActivityYet}</p>
      ) : (
        <div className='flex flex-col'>
          {activity.map((item) => (
            <AssistantPartView
              key={item.id}
              turnId={item.turnId}
              part={item.part}
              partIndex={item.partIndex}
              isPartStreaming={item.isPartStreaming}
            />
          ))}
        </div>
      )}
    </div>
  );
}
