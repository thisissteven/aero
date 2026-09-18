import { cn, Popover } from '@aero/ui';
import { ChevronDown, PencilToLine } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useState } from 'react';
import { openFileWhenReady } from '@/app/components/chat-aside/files/open-file-when-ready';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { useGitDiff } from '@/app/hooks/api/git';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { toWorkspaceRelative } from '@/app/lib/file';
import { useSidePanelStore } from '@/app/stores/side-panel-store';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export const SessionDiff = memo(function SessionDiff() {
  const directory = useSessionDirectory();
  const { data: diffData, isLoading } = useGitDiff(directory);
  const [isOpen, setIsOpen] = useState(false);

  const isChatInputExpanded = useChatInputExpanded();

  const isStatusPanelOpen = useStatusPanelStore((s) => s.isOpen);

  if (
    isLoading ||
    !diffData?.summary?.length ||
    isChatInputExpanded ||
    isStatusPanelOpen
  ) {
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
      <Popover.Trigger className='mb-2 focus-visible:ring-accent flex items-center justify-start gap-1 rounded-lg px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none border border-separator w-fit bg-surface-secondary'>
        <Icon data={PencilToLine} size={12} className='text-warning shrink-0' />
        <span className='line-clamp-1'>
          {fileCount} {fileCount === 1 ? 'file' : 'files'} changed
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
            'text-foreground/80 shrink-0 transition',
            isOpen && 'rotate-180',
          )}
        />
      </Popover.Trigger>

      <Popover.Content
        placement='top start'
        className='max-w-[calc(100vw-2rem)] rounded-lg md:max-w-sm min-w-44'
        offset={8}
      >
        <Popover.Dialog className='p-0'>
          <Popover.Heading className='px-2 pb-1 pt-2'>
            Changed files {fileCount}
          </Popover.Heading>

          <div className='max-h-[240px] scrollbar-thin overflow-y-auto'>
            <ol className='p-1'>
              {diffData.summary.map((file) => {
                const parts = file.path.split('/');
                const fileName = parts.pop();
                const dirPath = parts.join('/');

                return (
                  <li
                    key={file.path}
                    className='flex items-center justify-between gap-3 text-sm hover:bg-default/40 px-2 rounded-md cursor-pointer py-1'
                    onClick={() => {
                      if (!directory) return;
                      const relativePath = toWorkspaceRelative(
                        file.path,
                        directory,
                      );
                      useSidePanelStore.getState().setActiveNavItem('files');
                      openFileWhenReady(relativePath);
                      setIsOpen(false);
                    }}
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
});
