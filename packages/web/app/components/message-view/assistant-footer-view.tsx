// assistant-footer-view.tsx
import { Clock, CodeFork, Pin } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo } from 'react';

import { ChatMessage, Tooltip } from '@aero/ui';

import {
  MessageActionsCopy,
  MessageActionsReadAloud,
} from '@/app/components/message-view/message-actions';
import { formatDateTime } from '@/app/lib/date';

export const AssistantFooterView = memo(function AssistantFooterView({
  turnId,
  createdAt,
  assistantTextResponse,
}: {
  turnId: string;
  createdAt: string | Date;
  assistantTextResponse: string;
}) {
  return (
    <ChatMessage.Assistant className='group py-0'>
      <ChatMessage.Body className='pe-0 pt-2 pb-1'>
        <div className='flex w-full justify-start gap-3 pr-3'>
          <div className='text-muted flex items-center gap-1 text-xs opacity-100'>
            <Icon data={Clock} size={12} className='opacity-80' />
            {formatDateTime(createdAt)}
          </div>

          <MessageActionsReadAloud id={turnId} text={assistantTextResponse} />

          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <Icon
                data={CodeFork}
                size={16}
                className='opacity-50 transition hover:opacity-80'
              />
            </Tooltip.Trigger>
            <Tooltip.Content placement='bottom' offset={8}>
              <span>Fork from here</span>
            </Tooltip.Content>
          </Tooltip>

          <Tooltip delay={300}>
            <Tooltip.Trigger>
              <Icon
                data={Pin}
                size={16}
                className='opacity-50 transition hover:opacity-80'
              />
            </Tooltip.Trigger>
            <Tooltip.Content placement='bottom' offset={8}>
              <span>Pin into context (survives compaction)</span>
            </Tooltip.Content>
          </Tooltip>

          <MessageActionsCopy copyText={assistantTextResponse} />
        </div>
      </ChatMessage.Body>
    </ChatMessage.Assistant>
  );
});
