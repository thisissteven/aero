import { ChevronDown, PencilToLine } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import { cn, Popover } from '@aero/ui';

import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { useGitDiff } from '@/app/hooks/api/git';

export function SessionDiff({ workspace }: { workspace?: string }) {
  const { data: diffData, isLoading } = useGitDiff(workspace);
  const [isOpen, setIsOpen] = useState(false);

  if (isLoading || !diffData?.summary?.length) {
    return null;
  }

  const fileCount = diffData.summary.length;
  const totalAdditions = diffData.summary.reduce(
    (acc, item) => acc + item.additions,
    0,
  );
  const totalDeletions = diffData.summary.reduce(
    (acc, item) => acc + item.deletions,
    0,
  );

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger className='focus-visible:ring-accent mx-2 mb-2 flex items-center justify-start gap-1 text-sm focus-visible:ring-2 focus-visible:outline-none'>
        <Icon data={PencilToLine} size={12} className='text-warning shrink-0' />
        <span className='line-clamp-1'>
          {fileCount} {fileCount === 1 ? 'file' : 'files'} changed in workspace
        </span>

        {totalAdditions > 0 && (
          <span className='text-success text-xs'>+{totalAdditions}</span>
        )}
        {totalDeletions > 0 && (
          <span className='text-danger text-xs'>-{totalDeletions}</span>
        )}

        <Icon
          data={ChevronDown}
          size={12}
          className={cn(
            'text-foreground/80 transition',
            isOpen && 'rotate-180',
          )}
        />
      </Popover.Trigger>

      <Popover.Content
        placement='top left'
        className='max-w-[calc(100vw-2rem)] rounded-xl md:max-w-sm'
        crossOffset={-8}
      >
        <Popover.Dialog className='p-0'>
          <Popover.Heading className='p-3'>
            Changed files {fileCount}
          </Popover.Heading>

          <div className='max-h-[240px] scrollbar-thin overflow-y-auto pl-1'>
            <ol className='space-y-2 pr-3 pb-3 pl-2'>
              {diffData.summary.map((file) => {
                const parts = file.path.split('/');
                const fileName = parts.pop();
                const dirPath = parts.join('/');

                return (
                  <li
                    key={file.path}
                    className='flex items-center justify-between gap-3 text-sm'
                  >
                    <div className='flex items-center gap-1.5 overflow-hidden'>
                      <FileTypeIcon
                        filePath={fileName ?? `${dirPath}/${fileName}`}
                      />

                      <MiddleTruncatePath
                        path={file.path}
                        className='text-muted'
                        fileClassName='text-foreground'
                      />
                    </div>

                    <div className='flex shrink-0 items-center gap-1 text-xs'>
                      {file.additions > 0 && (
                        <span className='text-success'>+{file.additions}</span>
                      )}
                      {file.deletions > 0 && (
                        <span className='text-danger'>-{file.deletions}</span>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
