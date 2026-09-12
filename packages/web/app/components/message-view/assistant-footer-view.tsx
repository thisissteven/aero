// assistant-footer-view.tsx
import { memo } from 'react';

import { ChatMessage } from '@aero/ui';

import { FlatConversationVirtualItem } from '@/app/components/message-view/lib';
import {
  MessageActionsCopy,
  MessageActionsFork,
  MessageActionsPin,
  MessageActionsReadAloud,
} from '@/app/components/message-view/message-actions';
import { ProviderLogo } from '@/app/components/provider-logo';
import { formatDateTime } from '@/app/lib/date';
import { toPascalCase } from '@/server/shared';

export const AssistantFooterView = memo(function AssistantFooterView({
  item,
}: {
  item: Extract<FlatConversationVirtualItem, { type: 'assistant-footer' }>;
}) {
  const {
    createdAt,
    assistantTextResponse,
    nextTurnId,
    turnId,
    providerID,
    modelID,
    agent,
    variant,
    elapsedTime,
  } = item;

  return (
    <ChatMessage.Assistant className='group py-0'>
      <ChatMessage.Body className='pe-0 pt-2 pb-1'>
        <div className='flex flex-wrap items-center gap-2 select-none'>
          {modelID && (
            <span className='text-foreground flex shrink-0 items-center text-xs'>
              {providerID && (
                <ProviderLogo
                  className='mr-1 size-4 shrink-0'
                  alt={modelID}
                  providerId={providerID}
                />
              )}
              {toPascalCase(modelID)}
              {variant && (
                <span className='text-foreground text-xs'>/{variant}</span>
              )}
              {agent && (
                <span className='text-foreground ml-1 text-xs'>on {agent}</span>
              )}
            </span>
          )}

          {elapsedTime && (
            <span className='text-foreground text-xs whitespace-pre-wrap'>
              ~{elapsedTime}
            </span>
          )}
        </div>
        <div className='flex w-full flex-wrap items-center justify-start gap-2'>
          <div className='text-muted text-xs select-none'>
            {formatDateTime(createdAt)}
          </div>

          <div>
            <MessageActionsReadAloud id={turnId} text={assistantTextResponse} />

            <MessageActionsFork messageId={nextTurnId} />

            <MessageActionsPin messageId={turnId} />

            <MessageActionsCopy copyText={assistantTextResponse} />
          </div>
        </div>
      </ChatMessage.Body>
    </ChatMessage.Assistant>
  );
});
