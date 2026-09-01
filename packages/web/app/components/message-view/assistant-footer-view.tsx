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
import { FlatItem } from '@/app/components/message-view/unused/streaming-demo/streaming-demo-types';
import { ProviderLogo } from '@/app/components/provider-logo';
import { IconButton } from '@/app/components/ui/icon-button';
import { formatDateTime } from '@/app/lib/date';
import { toPascalCase } from '@/app/lib/file';

export const AssistantFooterView = memo(function AssistantFooterView({
  item,
}: {
  item: Extract<FlatItem, { type: 'assistant-footer' }>;
}) {
  const { createdAt, textResponse, nextTurnId, turnId, providerID, modelID } =
    item;

  return (
    <ChatMessage.Assistant className='group py-0'>
      <ChatMessage.Body className='pe-0 pt-2 pb-1'>
        <div className='flex w-full flex-wrap items-center justify-start gap-2 pr-3'>
          <div className='flex h-7 items-center gap-2'>
            {providerID && (
              <ProviderLogo
                className='size-4 shrink-0'
                alt={modelID}
                providerId={providerID}
              />
            )}

            {modelID && (
              <span className='text-foreground text-xs'>
                {toPascalCase(modelID)}
              </span>
            )}
          </div>

          <div className='text-muted flex items-center gap-1 text-xs opacity-100'>
            <Icon data={Clock} size={12} className='opacity-80' />
            {formatDateTime(createdAt)}
          </div>

          <div>
            <MessageActionsReadAloud id={turnId} text={textResponse} />

            <MessageActionsFork messageId={nextTurnId} />

            <Tooltip delay={300}>
              <IconButton>
                <Icon data={Pin} />
              </IconButton>
              <Tooltip.Content placement='bottom' offset={8}>
                <span>Pin into context (survives compaction)</span>
              </Tooltip.Content>
            </Tooltip>

            <MessageActionsCopy copyText={textResponse} />
          </div>
        </div>
      </ChatMessage.Body>
    </ChatMessage.Assistant>
  );
});
