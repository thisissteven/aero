// app/components/chat-aside/pr/pr-checks.tsx

import { Chip, cn, Skeleton } from '@aero/ui';
import { ArrowUpRightFromSquare, ChevronRight } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import { useI18n } from '@/app/hooks/i18n';

import { CheckStatusIcon, SectionEmpty, TimeAgo } from './shared';
import type { CheckRunDetail, CheckRunSummary } from './types';

export function PrChecks({
  summary,
  runs,
  isLoading,
}: {
  summary?: CheckRunSummary | null;
  runs?: CheckRunDetail[];
  isLoading?: boolean;
}) {
  const { t } = useI18n();

  if (isLoading && !runs?.length) {
    return (
      <div className='space-y-2 p-3'>
        <Skeleton className='h-10 w-full rounded-lg' />
        <Skeleton className='h-10 w-full rounded-lg' />
        <Skeleton className='h-10 w-full rounded-lg' />
      </div>
    );
  }

  if (!summary || summary.total === 0) {
    return <SectionEmpty>{t.pullRequest.noChecks}</SectionEmpty>;
  }

  return (
    <div className='space-y-2 p-3'>
      <div className='border-separator bg-default/30 flex items-center justify-between rounded-lg border px-3 py-2'>
        <span className='text-muted text-xs'>
          {summary.state === 'success'
            ? t.pullRequest.allChecksPassed
            : summary.state === 'failure'
              ? t.pullRequest.someChecksFailed
              : t.pullRequest.checksRunning}
        </span>
        <span className='text-muted font-mono text-xs'>
          {summary.success}/{summary.total}
        </span>
      </div>

      {runs?.map((run) => (
        <CheckRunRow key={run.id} run={run} />
      ))}
    </div>
  );
}

function CheckRunRow({ run }: { run: CheckRunDetail }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const hasDetail = Boolean(run.job?.steps?.length || run.annotations?.length);

  return (
    <div className='border-separator rounded-lg border'>
      <button
        type='button'
        onClick={() => hasDetail && setOpen((value) => !value)}
        className={cn(
          'flex w-full items-center gap-2 px-3 py-2 text-left',
          hasDetail && 'hover:bg-default/40',
        )}
      >
        <Icon
          data={ChevronRight}
          size={12}
          className={cn(
            'text-muted shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
            open && 'rotate-90',
            !hasDetail && 'opacity-0',
          )}
        />
        <CheckStatusIcon conclusion={run.conclusion} />
        <span className='min-w-0 flex-1 truncate text-xs font-medium'>
          {run.name}
        </span>
        {run.app?.name && (
          <span className='text-muted hidden shrink-0 text-xs sm:inline'>
            {run.app.name}
          </span>
        )}
        <TimeAgo value={run.completedAt ?? run.startedAt} />
        {run.detailsUrl && (
          <a
            href={run.detailsUrl}
            target='_blank'
            rel='noopener noreferrer'
            onClick={(event) => event.stopPropagation()}
            className='text-muted hover:text-foreground shrink-0'
            aria-label={t.pullRequest.checkDetails}
          >
            <Icon data={ArrowUpRightFromSquare} size={12} />
          </a>
        )}
      </button>

      {open && (
        <div className='border-separator space-y-2 border-t px-3 py-2'>
          {run.job?.steps?.map((step, index) => (
            <div
              key={`${step.number ?? index}-${step.name}`}
              className='flex items-center gap-2'
            >
              <CheckStatusIcon conclusion={step.conclusion} />
              <span className='text-muted min-w-0 flex-1 truncate text-xs'>
                {step.name}
              </span>
              <span className='text-muted font-mono text-[10px]'>
                {step.conclusion ?? step.status ?? ''}
              </span>
            </div>
          ))}

          {run.annotations?.map((annotation, index) => (
            <div
              key={`${annotation.path ?? ''}-${annotation.startLine ?? index}`}
              className='border-separator bg-default/30 rounded-md border p-2'
            >
              <div className='flex items-center gap-1.5'>
                <Chip
                  size='sm'
                  variant='soft'
                  color={
                    annotation.level === 'failure'
                      ? 'danger'
                      : annotation.level === 'warning'
                        ? 'warning'
                        : 'default'
                  }
                >
                  {annotation.level ?? 'info'}
                </Chip>
                {annotation.path && (
                  <span className='text-muted truncate font-mono text-[10px]'>
                    {annotation.path}
                    {annotation.startLine ? `:${annotation.startLine}` : ''}
                  </span>
                )}
              </div>
              {annotation.title && (
                <div className='mt-1 text-xs font-medium'>
                  {annotation.title}
                </div>
              )}
              <div className='text-muted mt-0.5 text-xs whitespace-pre-wrap'>
                {annotation.message}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
