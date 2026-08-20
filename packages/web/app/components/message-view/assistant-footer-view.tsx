// assistant-footer-view.tsx
import { Clock, Pin } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo } from 'react';

import { ChatMessage, Tooltip } from '@aero/ui';

import {
  MessageActionsCopy,
  MessageActionsFork,
  MessageActionsReadAloud,
} from '@/app/components/message-view/message-actions';
import { IconButton } from '@/app/components/ui/icon-button';
import { formatDateTime } from '@/app/lib/date';

export const AssistantFooterView = memo(function AssistantFooterView({
  turnId,
  createdAt,
  assistantTextResponse,
  nextTurnId,
}: {
  turnId: string;
  createdAt: string | Date;
  assistantTextResponse: string;
  nextTurnId: string;
}) {
  return (
    <ChatMessage.Assistant className='group py-0'>
      <ChatMessage.Body className='pe-0 pt-2 pb-1'>
        <div className='flex w-full justify-start gap-2 pr-3'>
          <div className='text-muted flex items-center gap-1 text-xs opacity-100'>
            <Icon data={Clock} size={12} className='opacity-80' />
            {formatDateTime(createdAt)}
          </div>

          <div>
            <MessageActionsReadAloud id={turnId} text={assistantTextResponse} />

            <MessageActionsFork messageId={nextTurnId} />

            <Tooltip delay={300}>
              <IconButton>
                <Icon data={Pin} />
              </IconButton>
              <Tooltip.Content placement='bottom' offset={8}>
                <span>Pin into context (survives compaction)</span>
              </Tooltip.Content>
            </Tooltip>

            <MessageActionsCopy copyText={assistantTextResponse} />
          </div>
        </div>
      </ChatMessage.Body>
    </ChatMessage.Assistant>
  );
});
