// app/components/chat-aside/pr/pr-files.tsx

import { Chip, cn, Skeleton } from '@aero/ui';
import { ChevronRight, FileCode } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import { useI18n } from '@/app/hooks/i18n';
import type { ChipColor } from './shared';
import { SectionEmpty } from './shared';
import type { PullFile } from './types';

const STATUS_COLORS: Record<string, ChipColor> = {
  added: 'success',
  removed: 'danger',
  modified: 'warning',
  renamed: 'accent',
};

const STATUS_LETTERS: Record<string, string> = {
  added: 'A',
  removed: 'D',
  modified: 'M',
  renamed: 'R',
  copied: 'C',
  changed: 'M',
};

export function PrFiles({
  files,
  isLoading,
}: {
  files?: PullFile[];
  isLoading?: boolean;
}) {
  const { t } = useI18n();

  if (isLoading && !files?.length) {
    return (
      <div className='space-y-2 p-3'>
        <Skeleton className='h-8 w-full rounded-lg' />
        <Skeleton className='h-8 w-full rounded-lg' />
        <Skeleton className='h-8 w-full rounded-lg' />
      </div>
    );
  }

  if (!files?.length) {
    return <SectionEmpty>{t.pullRequest.noFilesChanged}</SectionEmpty>;
  }

  return (
    <div className='space-y-1.5 p-3'>
      {files.map((file) => (
        <FileRow key={file.filename} file={file} />
      ))}
    </div>
  );
}

function FileRow({ file }: { file: PullFile }) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const status = file.status.toLowerCase();

  return (
    <div className='border-separator rounded-lg border'>
      <button
        type='button'
        onClick={() => setOpen((value) => !value)}
        className='hover:bg-default/40 flex w-full items-center gap-2 px-2.5 py-1.5 text-left'
      >
        <Icon
          data={ChevronRight}
          size={12}
          className={cn(
            'text-muted shrink-0 transition-transform duration-150 ease-out motion-reduce:transition-none',
            open && 'rotate-90',
          )}
        />
        <Chip
          size='sm'
          variant='soft'
          color={STATUS_COLORS[status] ?? 'default'}
        >
          {STATUS_LETTERS[status] ?? status.slice(0, 1).toUpperCase()}
        </Chip>
        <Icon data={FileCode} size={12} className='text-muted shrink-0' />
        <span className='min-w-0 flex-1 truncate font-mono text-xs'>
          {file.filename}
        </span>
        <span className='shrink-0 font-mono text-[10px]'>
          <span className='text-success'>+{file.additions}</span>{' '}
          <span className='text-danger'>−{file.deletions}</span>
        </span>
      </button>

      {open && (
        <div className='border-separator border-t'>
          {file.patch ? (
            <pre className='scrollbar-thin max-h-96 overflow-auto px-2.5 py-2 text-[11px] leading-relaxed'>
              {file.patch.split('\n').map((line, index) => (
                <div
                  key={index}
                  className={cn(
                    'whitespace-pre',
                    line.startsWith('+') && !line.startsWith('+++')
                      ? 'text-success'
                      : line.startsWith('-') && !line.startsWith('---')
                        ? 'text-danger'
                        : line.startsWith('@@')
                          ? 'text-accent'
                          : 'text-muted',
                  )}
                >
                  {line}
                </div>
              ))}
            </pre>
          ) : (
            <div className='text-muted px-2.5 py-2 text-xs'>
              {t.pullRequest.diffUnavailable}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
