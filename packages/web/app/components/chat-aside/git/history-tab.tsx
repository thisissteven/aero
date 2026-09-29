// app/components/chat-aside/git/history-tab.tsx
import { IconButton, Modal, Skeleton, Tooltip } from '@aero/ui';
import { CodeCommit, Copy, Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useEffect, useRef, useState } from 'react';

import { DiffWorkbench } from '@/app/components/chat-aside/changes/diff-workbench';
import { useGitCommitDiff, useGitLog } from '@/app/hooks/api/git';
import { useI18n } from '@/app/hooks/i18n';
import { formatCompactRelativeTime } from '@/app/lib';
import { toastPromise } from '@/app/lib/toast';

import { EmptyState, ListSkeleton } from './shared';
import type { CommitHistoryEntry } from './types';

export function HistoryTab({ directory }: { directory: string }) {
  const { t } = useI18n();
  const [selected, setSelected] = useState<CommitHistoryEntry | null>(null);
  const { data, isLoading, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useGitLog(directory);

  const sentinelRef = useRef<HTMLDivElement>(null);

  // Infinite scroll: fetch the next page once the sentinel nears the viewport.
  useEffect(() => {
    const node = sentinelRef.current;
    if (!node || !hasNextPage || isFetchingNextPage) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void fetchNextPage();
      },
      { rootMargin: '160px' },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  const commits = data?.pages.flatMap((page) => page.commits ?? []) ?? [];

  if (isLoading) return <ListSkeleton />;

  return (
    <div className='flex flex-col p-2'>
      {commits.length === 0 ? (
        <EmptyState label={t.gitPanel.noCommits} />
      ) : (
        <ul className='space-y-0.5'>
          {commits.map((commit) => (
            <li key={commit.sha}>
              <button
                type='button'
                onClick={() => setSelected(commit)}
                className='hover:bg-default/40 flex w-full flex-col gap-0.5 rounded-md px-2 py-1.5 text-left transition-colors'
              >
                <div className='flex items-center gap-2'>
                  <Icon
                    data={CodeCommit}
                    size={12}
                    className='text-muted shrink-0'
                  />
                  <span className='min-w-0 flex-1 truncate text-sm'>
                    {commit.subject}
                  </span>
                  <span className='text-muted shrink-0 font-mono text-xs tabular-nums'>
                    {commit.sha.slice(0, 7)}
                  </span>
                </div>
                <div className='text-muted flex min-w-0 items-center gap-1.5 pl-5 text-xs'>
                  <span className='truncate'>{commit.author}</span>
                  <span aria-hidden className='shrink-0'>
                    ·
                  </span>
                  <span className='shrink-0'>
                    {formatCompactRelativeTime(commit.date, true)}
                  </span>
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}

      {hasNextPage && (
        <div ref={sentinelRef} className='flex items-center justify-center p-2'>
          {isFetchingNextPage && <Skeleton className='h-7 w-3/4 rounded' />}
        </div>
      )}

      <CommitDetailModal
        directory={directory}
        commit={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

function CommitDetailModal({
  directory,
  commit,
  onClose,
}: {
  directory: string;
  commit: CommitHistoryEntry | null;
  onClose: () => void;
}) {
  const { t } = useI18n();
  const { data, isLoading } = useGitCommitDiff(directory, commit?.sha);
  const diff = (data as { diff?: string } | null | undefined)?.diff;

  const handleCopyHash = () => {
    if (!commit) return;
    void toastPromise(navigator.clipboard.writeText(commit.sha), {
      loading: t.gitPanel.copyHash,
      success: t.gitPanel.hashCopied,
      error: (error) =>
        error.message || t.gitPanel.operationFailed(t.gitPanel.copyHash),
    });
  };

  return (
    <Modal
      isOpen={Boolean(commit)}
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
    >
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog className='bg-surface text-foreground my-auto flex h-[92dvh] w-full max-w-[1500px] flex-col gap-0 overflow-hidden rounded-xl p-0 sm:h-[85vh]'>
            {({ close }) => (
              <>
                <div className='border-separator flex shrink-0 items-center gap-2 border-b px-2 py-2.5'>
                  <Icon
                    data={CodeCommit}
                    size={14}
                    className='text-accent shrink-0'
                  />
                  <span className='min-w-0 flex-1 truncate text-sm font-medium'>
                    {commit?.subject}
                  </span>
                  <div className='flex shrink-0 items-center gap-0'>
                    <Tooltip>
                      <Tooltip.Trigger>
                        <IconButton
                          aria-label={t.gitPanel.copyHash}
                          onPress={handleCopyHash}
                        >
                          <Icon data={Copy} />
                        </IconButton>
                      </Tooltip.Trigger>
                      <Tooltip.Content>{t.gitPanel.copyHash}</Tooltip.Content>
                    </Tooltip>
                    <Tooltip>
                      <Tooltip.Trigger>
                        <IconButton aria-label={t.common.close} onPress={close}>
                          <Icon data={Xmark} />
                        </IconButton>
                      </Tooltip.Trigger>
                      <Tooltip.Content>{t.common.close}</Tooltip.Content>
                    </Tooltip>
                  </div>
                </div>

                <div className='border-separator flex shrink-0 flex-col gap-1 border-b px-3 py-2'>
                  <div className='text-muted flex min-w-0 items-center gap-1.5 text-xs'>
                    <span className='tabular-nums'>
                      {commit?.sha.slice(0, 7)}
                    </span>
                    <span aria-hidden className='shrink-0'>
                      ·
                    </span>
                    <span className='min-w-0 truncate'>{commit?.author}</span>
                    <span aria-hidden className='shrink-0'>
                      ·
                    </span>
                    <span className='shrink-0'>
                      {formatCompactRelativeTime(commit?.date, true)}
                    </span>
                  </div>

                  {commit?.body && (
                    <p
                      className='text-muted line-clamp-2 text-xs whitespace-pre-wrap'
                      title={commit.body}
                    >
                      {commit.body}
                    </p>
                  )}
                </div>

                <div className='min-h-0 flex-1 overflow-hidden'>
                  <DiffWorkbench patch={diff} isLoading={isLoading} />
                </div>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
