import { cn, Popover } from '@aero/ui';
import { ArrowsRotateLeft, PencilToLine } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useMemo, useState } from 'react';
import { openFileWhenReady } from '@/app/components/chat-aside/files/open-file-when-ready';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { useGitStatus } from '@/app/hooks/api/git';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { toWorkspaceRelative } from '@/app/lib/file';
import { useSidePanelStore } from '@/app/stores/side-panel-store';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

interface DiffSummaryEntry {
  path: string;
  additions: number;
  deletions: number;
}

interface DiffStat {
  path: string;
  additions: number;
  deletions: number;
}

interface GitStatusData {
  not_added?: string[];
  diffStats?: {
    staged?: Record<string, DiffStat>;
    working?: Record<string, DiffStat>;
  };
}

function deriveSummary(
  status: GitStatusData | null | undefined,
): DiffSummaryEntry[] {
  if (!status) return [];

  const map = new Map<string, DiffSummaryEntry>();

  const mergeStat = (stat: DiffStat) => {
    const existing = map.get(stat.path);
    if (existing) {
      existing.additions += stat.additions;
      existing.deletions += stat.deletions;
    } else {
      map.set(stat.path, {
        path: stat.path,
        additions: stat.additions,
        deletions: stat.deletions,
      });
    }
  };

  if (status.diffStats?.staged) {
    for (const stat of Object.values(status.diffStats.staged)) {
      mergeStat(stat);
    }
  }

  if (status.diffStats?.working) {
    for (const stat of Object.values(status.diffStats.working)) {
      mergeStat(stat);
    }
  }

  for (const untracked of status.not_added ?? []) {
    if (!map.has(untracked)) {
      map.set(untracked, { path: untracked, additions: 0, deletions: 0 });
    }
  }

  return Array.from(map.values());
}

export const SessionDiff = memo(function SessionDiff() {
  const directory = useSessionDirectory();
  const { data: statusData, isLoading } = useGitStatus(directory);
  const [isOpen, setIsOpen] = useState(false);

  const isChatInputExpanded = useChatInputExpanded();
  const isStatusPanelOpen = useStatusPanelStore((s) => s.isOpen);

  const summary = useMemo(
    () => deriveSummary(statusData as GitStatusData | null | undefined),
    [statusData],
  );

  if (
    isLoading ||
    summary.length === 0 ||
    isChatInputExpanded ||
    isStatusPanelOpen
  ) {
    return null;
  }

  const fileCount = summary.length;
  const totalAdditions = summary.reduce((acc, item) => acc + item.additions, 0);
  const totalDeletions = summary.reduce((acc, item) => acc + item.deletions, 0);

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger className='focus-visible:ring-accent flex items-center justify-start gap-1 rounded-lg px-2 py-1 text-sm focus-visible:ring-2 focus-visible:outline-none border border-separator w-fit bg-surface'>
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

        <RefetchButton />
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
              {summary.map((file) => {
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

function RefetchButton() {
  const directory = useSessionDirectory();
  const { refetch } = useGitStatus(directory);

  const [isPending, setIsPending] = useState(false);

  return (
    <div
      onClick={(e) => {
        e.stopPropagation();
        if (isPending) return;
        setIsPending(true);
        refetch();
        setTimeout(() => {
          setIsPending(false);
        }, 1000);
      }}
      className='ml-1'
    >
      <Icon
        data={ArrowsRotateLeft}
        size={12}
        className={cn(
          'text-foreground/80 shrink-0 transition',
          isPending && 'animate-spin origin-center',
        )}
      />
    </div>
  );
}
