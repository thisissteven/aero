import { useParams } from '@tanstack/react-router';
import { VList } from 'virtua';

import { cn, CodeBlock, Disclosure, Typography } from '@aero/ui';

import { DeferredView } from '@/app/components/deferred-view';
import { CodeBlockContent } from '@/app/components/tool-call-view/tool-call-view';
import { useSession, useSessionContext } from '@/app/hooks/api/sessions';
import { formatDateTimeFull } from '@/app/lib/date';

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
  const { sessionId } = useParams({
    strict: false,
  });

  if (!sessionId)
    return (
      <div className='text-muted flex flex-1 items-center justify-center p-6 text-center text-sm'>
        Open a session to view its context details.
      </div>
    );

  return <ContextPanelContent sessionId={sessionId} />;
}

function ContextPanelContent({ sessionId }: { sessionId: string }) {
  const { data } = useSessionContext(undefined, sessionId);
  const { data: session } = useSession(undefined, sessionId);

  if (!data) {
    return null;
  }

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
  } = data;

  return (
    <div className='bg-background text-foreground absolute inset-0 flex h-full w-full flex-col'>
      <VList className='h-full w-full scrollbar-thin p-4 pb-2' itemSize={56}>
        {/* Header: Title, Provider/Model, and Date */}
        <div className='mb-4 flex flex-col gap-1'>
          <Typography type='h5' weight='semibold' className='text-foreground'>
            {session?.title}
          </Typography>
          <Typography type='body-sm' color='muted'>
            {[provider, model].filter(Boolean).join(' / ')}
            {createdAt ? ` · ${formatDateTimeFull(createdAt)}` : ''}
          </Typography>
        </div>

        {/* Context Usage Box */}
        <div className='bg-surface mb-4 flex flex-col gap-2 rounded-xl p-3 shadow-sm'>
          <div className='flex items-center justify-between'>
            <Typography type='body-sm' color='muted'>
              Context
            </Typography>
            <Typography type='body-sm' color='muted'>
              {context.used.toLocaleString()} / {context.limit.toLocaleString()}
            </Typography>
          </div>

          {/* Progress Bar */}
          <div className='bg-default h-1.5 w-full overflow-hidden rounded-full'>
            <div
              className='bg-accent h-full transition-all duration-300'
              style={{
                width: `${Math.min(100, Math.max(0, context.usedPercentage))}%`,
              }}
            />
          </div>

          <Typography
            type='body-sm'
            weight='medium'
            className='text-foreground'
          >
            {context.usedPercentage.toFixed(1)}% used
          </Typography>
        </div>

        {/* Stat Cards Grid (2x2) */}
        <div className='mb-4 grid grid-cols-2 gap-2'>
          <div className='bg-surface flex flex-col gap-1 rounded-xl p-3 shadow-sm'>
            <Typography type='body-sm' color='muted'>
              Messages
            </Typography>
            <Typography type='h4' weight='semibold'>
              {messages}
            </Typography>
          </div>

          <div className='bg-surface flex flex-col gap-1 rounded-xl p-3 shadow-sm'>
            <Typography type='body-sm' color='muted'>
              User
            </Typography>
            <Typography type='h4' weight='semibold'>
              {user}
            </Typography>
          </div>

          <div className='bg-surface flex flex-col gap-1 rounded-xl p-3 shadow-sm'>
            <Typography type='body-sm' color='muted'>
              Assistant
            </Typography>
            <Typography type='h4' weight='semibold'>
              {assistant}
            </Typography>
          </div>

          <div className='bg-surface flex flex-col gap-1 rounded-xl p-3 shadow-sm'>
            <Typography type='body-sm' color='muted'>
              Cost
            </Typography>
            <Typography type='h4' weight='semibold'>
              {formatCost(cost)}
            </Typography>
          </div>
        </div>

        {/* Last Assistant Message Section */}
        <div className='bg-surface mb-4 flex flex-col gap-3 rounded-xl p-3 shadow-sm'>
          <Typography type='body-sm' color='muted'>
            Last Assistant Message
          </Typography>

          <div className='grid grid-cols-3 gap-x-2 gap-y-4'>
            <div className='flex flex-col gap-0.5'>
              <Typography type='body-xs' color='muted'>
                Input
              </Typography>
              <Typography type='body-sm' weight='semibold'>
                {lastAssistantMessage.input.toLocaleString()}
              </Typography>
            </div>

            <div className='flex flex-col gap-0.5'>
              <Typography type='body-xs' color='muted'>
                Output
              </Typography>
              <Typography type='body-sm' weight='semibold'>
                {lastAssistantMessage.output.toLocaleString()}
              </Typography>
            </div>

            <div className='flex flex-col gap-0.5'>
              <Typography type='body-xs' color='muted'>
                Reasoning
              </Typography>
              <Typography type='body-sm' weight='semibold'>
                {lastAssistantMessage.reasoning.toLocaleString()}
              </Typography>
            </div>

            <div className='flex flex-col gap-0.5'>
              <Typography type='body-xs' color='muted'>
                Cache Read
              </Typography>
              <Typography type='body-sm' weight='semibold'>
                {lastAssistantMessage.cacheRead.toLocaleString()}
              </Typography>
            </div>

            <div className='flex flex-col gap-0.5'>
              <Typography type='body-xs' color='muted'>
                Cache Write
              </Typography>
              <Typography type='body-sm' weight='semibold'>
                {lastAssistantMessage.cacheWrite.toLocaleString()}
              </Typography>
            </div>

            <div className='flex flex-col gap-0.5'>
              <Typography type='body-xs' color='muted'>
                Cache Hit
              </Typography>
              <Typography type='body-sm' weight='semibold'>
                {lastAssistantMessage.cacheHit.toFixed(1)}%
              </Typography>
            </div>
          </div>
        </div>

        {/* Distribution Bar */}
        <div
          className={cn(
            'flex flex-col gap-2',
            rawMessages.length === 0 ? '' : 'mb-4',
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
                User {Math.round(distribution.userPercentage)}%
              </Typography>
            </div>

            <div className='flex items-center gap-1.5'>
              <span className='bg-accent h-2 w-2 rounded-full' />
              <Typography type='body-xs' color='muted'>
                Assistant {Math.round(distribution.assistantPercentage)}%
              </Typography>
            </div>

            <div className='flex items-center gap-1.5'>
              <span className='h-2 w-2 rounded-full bg-amber-500' />
              <Typography type='body-xs' color='muted'>
                Tool Calls {Math.round(distribution.toolCallPercentage)}%
              </Typography>
            </div>

            <div className='flex items-center gap-1.5'>
              <span className='bg-muted h-2 w-2 rounded-full' />
              <Typography type='body-xs' color='muted'>
                Other {Math.round(distribution.otherPercentage)}%
              </Typography>
            </div>
          </div>
        </div>

        {/* Section Header for Raw Messages */}
        {rawMessages.length > 0 && (
          <div className='mb-3'>
            <Typography type='body-sm' color='muted'>
              Raw Messages
            </Typography>
          </div>
        )}

        {/* Virtualized Message Items */}
        {rawMessages.map((msg, index) => (
          <div key={`${msg.createdAt}-${index}`} className='mb-2'>
            <Disclosure>
              <Disclosure.Heading>
                <Disclosure.Trigger className='w-full'>
                  <div className='bg-surface flex items-center justify-between gap-2 rounded-xl p-3 shadow-sm'>
                    <div className='flex min-w-0 items-center gap-2'>
                      <Typography
                        type='body-sm'
                        className='text-foreground text-muted min-w-0 truncate'
                      >
                        {msg.role === 'user' ? (
                          <span className='text-foreground font-medium'>
                            User:{' '}
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
                <DeferredView>
                  <CodeBlock className='bg-transparent'>
                    <CodeBlockContent
                      code={msg.rawContent}
                      language='json'
                      scrollOverflow={true}
                    />
                  </CodeBlock>
                </DeferredView>
              </Disclosure.Content>
            </Disclosure>
          </div>
        ))}
      </VList>
    </div>
  );
}
