// app/components/chat-aside/git/history-tab.tsx
import { Button, IconButton, Modal, Skeleton, Tooltip } from '@aero/ui';
import { CodeCommit, Copy } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import { useGitCommitDiff, useGitLog } from '@/app/hooks/api/git';
import { useI18n } from '@/app/hooks/i18n';
import { formatCompactRelativeTime } from '@/app/lib';
import { toastPromise } from '@/app/lib/toast';

import { GitDiffContent } from './git-diff-content';
import { EmptyState, ListSkeleton } from './shared';
import type { CommitHistoryEntry } from './types';

export function HistoryTab({ directory }: { directory: string }) {
  const { t } = useI18n();
  const [limit, setLimit] = useState(50);
  const [selected, setSelected] = useState<CommitHistoryEntry | null>(null);
  const { data, isLoading, isFetching } = useGitLog(directory, limit);

  const commits =
    (data as { commits?: CommitHistoryEntry[] } | null | undefined)?.commits ??
    [];

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

      {commits.length >= limit && limit < 500 && (
        <Button
          size='sm'
          variant='ghost'
          onPress={() => setLimit((value) => Math.min(value + 50, 500))}
          isPending={isFetching}
          className='mt-1 h-7 text-xs'
        >
          {t.gitPanel.loadMore}
        </Button>
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
          <Modal.Dialog>
            {({ close }) => (
              <>
                <Modal.Header className='flex items-center gap-2'>
                  <Icon
                    data={CodeCommit}
                    size={14}
                    className='text-accent shrink-0'
                  />
                  <span className='min-w-0 flex-1 truncate text-sm'>
                    {commit?.subject}
                  </span>
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
                </Modal.Header>

                <Modal.Body>
                  <div className='text-muted mb-3 flex min-w-0 items-center gap-1.5 text-xs'>
                    <span className='font-mono tabular-nums'>
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
                    <p className='text-muted mb-3 text-sm whitespace-pre-wrap'>
                      {commit.body}
                    </p>
                  )}

                  {isLoading ? (
                    <Skeleton className='h-40 w-full rounded' />
                  ) : (
                    <GitDiffContent
                      diff={diff}
                      emptyLabel={t.changesPanel.noChangesToDisplay}
                      className='max-h-[60vh]'
                    />
                  )}
                </Modal.Body>

                <Modal.Footer>
                  <Button size='sm' variant='ghost' onPress={close}>
                    {t.common.close}
                  </Button>
                </Modal.Footer>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
