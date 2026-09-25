import {
  cn,
  Disclosure,
  Label,
  ProgressBar,
  Skeleton,
  Typography,
} from '@aero/ui';
import { memo, useMemo } from 'react';
import { VList } from 'virtua';
import { CodeBlock } from '@/app/components/code-block/code-block';
import { CodeBlockContent } from '@/app/components/code-block/code-block-content';
import { useSession, useSessionContext } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { formatDateTimeFull } from '@/app/lib/date';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import { useKeepMountedStoreContext } from '@/app/stores/keep-mounted';
import { AeroSessionContextDetails } from '@/server/services/harness/types';

function formatCost(cost: number): string {
  return `$${cost.toFixed(2)}`;
}

function formatTime(timestamp: number): string {
  if (!timestamp) return '';
  const date = new Date(timestamp);
  const month = date.getMonth() + 1;
  const day = date.getDate();
  const timeStr = date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  return `${month}/${day}, ${timeStr}`;
}

export function ContextPanel() {
  const sessionId = useSessionId();
  const { t } = useI18n();

  const { data: contextDetails, isLoading } = useSessionContext(
    undefined,
    sessionId,
  );
  const { data: session } = useSession(undefined, sessionId);

  if (!sessionId)
    return (
      <div className='text-muted flex flex-1 items-center justify-center p-6 text-center text-sm'>
        {t.contextPanel.openSession}
      </div>
    );

  if (isLoading) {
    return (
      <div className='relative h-full w-full scrollbar-thin overflow-y-auto'>
        <div className='absolute inset-0 space-y-4 p-4'>
          <div className='space-y-2'>
            <Skeleton className='h-8 w-full' />
            <Skeleton className='h-6 w-3/4' />
          </div>
          <Skeleton className='h-20' />
          <div className='grid grid-cols-2 gap-2'>
            <Skeleton className='h-20' />
            <Skeleton className='h-20' />
            <Skeleton className='h-20' />
            <Skeleton className='h-20' />
          </div>
          <Skeleton className='h-40' />
          <div className='space-y-2'>
            <Skeleton className='h-4 w-full' />
            <Skeleton className='h-4 w-3/4' />
            <Skeleton className='h-4 w-3/4' />
          </div>
        </div>
      </div>
    );
  }

  if (!session || !contextDetails) return null;

  return (
    <ContextPanelContent contextDetails={contextDetails} session={session} />
  );
}

type ContextPanelContentProps = {
  contextDetails: NonNullable<ReturnType<typeof useSessionContext>['data']>;
  session: NonNullable<ReturnType<typeof useSession>['data']>;
};

function ContextPanelContent({
  contextDetails,
  session,
}: ContextPanelContentProps) {
  const { t } = useI18n();
  const {
    provider,
    model,
    createdAt,
    context,
    messages,
    user,
    assistant,
    cost,
    lastAssistantMessage,
    distribution,
    rawMessages,
  } = contextDetails;

  const keepIds = useKeepMountedStoreContext((s) => s.ids);

  const keepMounted = useMemo(() => {
    const STATIC_HEADER_COUNT = 6;

    const idToIndex = new Map(
      rawMessages.map((msg, i) => [msg.id, i + STATIC_HEADER_COUNT]),
    );

    const out: number[] = rawMessages.length > 0 ? [0, 1, 2, 3, 4, 5] : [];
    for (const id in keepIds) {
      if (keepIds[id]) {
        const idx = idToIndex.get(id);
        if (idx !== undefined) out.push(idx);
      }
    }

    return out;
  }, [keepIds, rawMessages]);

  return (
    <VList
      keepMounted={keepMounted}
      className='h-full w-full scrollbar-thin p-4 pb-2'
    >
      {/* Header: Title, Provider/Model, and Date */}
      <div className='flex flex-col gap-1 pb-4'>
        <Typography type='h6' weight='semibold' className='text-foreground'>
          {session?.title}
        </Typography>
        <Typography type='body-sm' color='muted'>
          {[provider, model].filter(Boolean).join(' / ')}
          {createdAt ? ` · ${formatDateTimeFull(createdAt)}` : ''}
        </Typography>
      </div>

      {/* Context Usage Box */}
      <div className='pb-4'>
        <div className='bg-surface flex flex-col gap-2 rounded-xl p-3 pb-4'>
          <div className='flex items-center justify-between'>
            <Typography type='body-sm' color='muted'>
              {t.statusPanel.context}
            </Typography>
            <Typography type='body-sm' color='muted'>
              {context.used.toLocaleString()} / {context.limit.toLocaleString()}
            </Typography>
          </div>

          {/* Progress Bar */}
          <ProgressBar
            aria-label={t.statusPanel.contextUsageAria}
            className='w-full'
            minValue={0}
            maxValue={100}
            value={Math.min(100, Math.max(0, context.usedPercentage))}
          >
            <Label className='sr-only'>{t.contextPanel.contextUsage}</Label>
            <ProgressBar.Track className='h-1.5'>
              <ProgressBar.Fill />
            </ProgressBar.Track>
          </ProgressBar>

          <Typography
            type='body-sm'
            weight='medium'
            className='text-foreground'
          >
            {t.contextPanel.percentUsed(context.usedPercentage.toFixed(1))}
          </Typography>
        </div>
      </div>

      {/* Stat Cards Grid (2x2) */}
      <div className='grid grid-cols-2 gap-2 pb-4'>
        <div className='bg-surface flex flex-col gap-1 rounded-xl p-3'>
          <Typography type='body-sm' color='muted'>
            {t.contextPanel.messages}
          </Typography>
          <Typography type='h6' weight='semibold'>
            {messages}
          </Typography>
        </div>

        <div className='bg-surface flex flex-col gap-1 rounded-xl p-3'>
          <Typography type='body-sm' color='muted'>
            {t.contextPanel.user}
          </Typography>
          <Typography type='h6' weight='semibold'>
            {user}
          </Typography>
        </div>

        <div className='bg-surface flex flex-col gap-1 rounded-xl p-3'>
          <Typography type='body-sm' color='muted'>
            {t.contextPanel.assistant}
          </Typography>
          <Typography type='h6' weight='semibold'>
            {assistant}
          </Typography>
        </div>

        <div className='bg-surface flex flex-col gap-1 rounded-xl p-3'>
          <Typography type='body-sm' color='muted'>
            {t.contextPanel.cost}
          </Typography>
          <Typography type='h6' weight='semibold'>
            {formatCost(cost)}
          </Typography>
        </div>
      </div>

      {/* Last Assistant Message Section */}
      <div className='pb-4'>
        <div className='bg-surface flex flex-col gap-3 rounded-xl p-3'>
          <Typography type='body-sm' color='muted'>
            {t.contextPanel.lastAssistantMessage}
          </Typography>

          <div className='grid grid-cols-3 gap-x-2 gap-y-4'>
            <div className='flex flex-col gap-0.5'>
              <Typography type='body-xs' color='muted'>
                {t.modelPicker.input}
              </Typography>
              <Typography type='body-sm' weight='semibold'>
                {lastAssistantMessage.input.toLocaleString()}
              </Typography>
            </div>

            <div className='flex flex-col gap-0.5'>
              <Typography type='body-xs' color='muted'>
                {t.modelPicker.output}
              </Typography>
              <Typography type='body-sm' weight='semibold'>
                {lastAssistantMessage.output.toLocaleString()}
              </Typography>
            </div>

            <div className='flex flex-col gap-0.5'>
              <Typography type='body-xs' color='muted'>
                {t.contextPanel.reasoning}
              </Typography>
              <Typography type='body-sm' weight='semibold'>
                {lastAssistantMessage.reasoning.toLocaleString()}
              </Typography>
            </div>

            <div className='flex flex-col gap-0.5'>
              <Typography type='body-xs' color='muted'>
                {t.contextPanel.cacheRead}
              </Typography>
              <Typography type='body-sm' weight='semibold'>
                {lastAssistantMessage.cacheRead.toLocaleString()}
              </Typography>
            </div>

            <div className='flex flex-col gap-0.5'>
              <Typography type='body-xs' color='muted'>
                {t.contextPanel.cacheWrite}
              </Typography>
              <Typography type='body-sm' weight='semibold'>
                {lastAssistantMessage.cacheWrite.toLocaleString()}
              </Typography>
            </div>

            <div className='flex flex-col gap-0.5'>
              <Typography type='body-xs' color='muted'>
                {t.contextPanel.cacheHit}
              </Typography>
              <Typography type='body-sm' weight='semibold'>
                {lastAssistantMessage.cacheHit.toFixed(1)}%
              </Typography>
            </div>
          </div>
        </div>
      </div>

      {/* Distribution Bar */}
      <div
        className={cn(
          'flex flex-col gap-2',
          rawMessages.length === 0 ? '' : 'pb-4',
        )}
      >
        <div className='bg-default flex h-1.5 w-full overflow-hidden rounded-full'>
          <div
            className='bg-emerald-500'
            style={{ width: `${distribution.userPercentage}%` }}
          />
          <div
            className='bg-accent'
            style={{ width: `${distribution.assistantPercentage}%` }}
          />
          <div
            className='bg-amber-500'
            style={{ width: `${distribution.toolCallPercentage}%` }}
          />
          <div
            className='bg-muted'
            style={{ width: `${distribution.otherPercentage}%` }}
          />
        </div>

        {/* Legend */}
        <div className='flex flex-wrap items-center gap-x-4 gap-y-1'>
          <div className='flex items-center gap-1.5'>
            <span className='h-2 w-2 rounded-full bg-emerald-500' />
            <Typography type='body-xs' color='muted'>
              {t.contextPanel.user} {Math.round(distribution.userPercentage)}%
            </Typography>
          </div>

          <div className='flex items-center gap-1.5'>
            <span className='bg-accent h-2 w-2 rounded-full' />
            <Typography type='body-xs' color='muted'>
              {t.contextPanel.assistant}{' '}
              {Math.round(distribution.assistantPercentage)}%
            </Typography>
          </div>

          <div className='flex items-center gap-1.5'>
            <span className='h-2 w-2 rounded-full bg-amber-500' />
            <Typography type='body-xs' color='muted'>
              {t.contextPanel.toolCalls}{' '}
              {Math.round(distribution.toolCallPercentage)}%
            </Typography>
          </div>

          <div className='flex items-center gap-1.5'>
            <span className='bg-muted h-2 w-2 rounded-full' />
            <Typography type='body-xs' color='muted'>
              {t.contextPanel.other} {Math.round(distribution.otherPercentage)}%
            </Typography>
          </div>
        </div>
      </div>

      {/* Section Header for Raw Messages */}
      {rawMessages.length > 0 && (
        <div className='pb-3'>
          <Typography type='body-sm' color='muted'>
            {t.contextPanel.rawMessages}
          </Typography>
        </div>
      )}

      {/* Virtualized Message Items */}
      {rawMessages.map((msg) => (
        <MessageItem key={msg.id} msg={msg} />
      ))}
    </VList>
  );
}

const MessageItem = memo(
  function MessageItem({
    msg,
  }: {
    msg: AeroSessionContextDetails['rawMessages'][number];
  }) {
    const { t } = useI18n();
    const isExpanded = useKeepMountedStoreContext((s) =>
      Boolean(s.ids[msg.id]),
    );
    const setKeep = useKeepMountedStoreContext((s) => s.setKeep);

    return (
      <Disclosure
        isExpanded={isExpanded}
        onExpandedChange={() => setKeep(msg.id, !isExpanded)}
        className='pb-2'
      >
        <Disclosure.Heading>
          <Disclosure.Trigger className='w-full'>
            <div className='bg-surface flex items-center justify-between gap-2 rounded-xl p-3'>
              <div className='flex min-w-0 items-center gap-2'>
                <Typography
                  type='body-sm'
                  className='text-foreground text-muted min-w-0 truncate'
                >
                  {msg.role === 'user' ? (
                    <span className='text-foreground font-medium'>
                      {t.contextPanel.userPrefix}{' '}
                    </span>
                  ) : (
                    ''
                  )}
                  {msg.text || '—'}
                </Typography>
              </div>

              <div className='flex shrink-0 items-center gap-3'>
                {msg.role === 'assistant' && (
                  <Typography
                    type='body-sm'
                    color='muted'
                    className='text-muted shrink-0'
                  >
                    {msg.input} / {msg.output}
                  </Typography>
                )}
                <Typography
                  type='body-sm'
                  color='muted'
                  className='text-muted shrink-0'
                >
                  {formatTime(msg.createdAt)}
                </Typography>
              </div>
            </div>
          </Disclosure.Trigger>
        </Disclosure.Heading>
        <Disclosure.Content>
          {isExpanded && (
            <CodeBlock className='border-0 py-2'>
              <CodeBlockContent
                code={msg.rawContent}
                language='json'
                scrollOverflow
                className='p-1'
              />
            </CodeBlock>
          )}
        </Disclosure.Content>
      </Disclosure>
    );
  },
  (prev, next) => prev.msg.id === next.msg.id,
);
