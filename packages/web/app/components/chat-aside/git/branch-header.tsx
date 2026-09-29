// app/components/chat-aside/git/branch-header.tsx
import { Chip, cn, IconButton, Tooltip } from '@aero/ui';
import {
  ArrowDown,
  ArrowRotateLeft,
  ArrowsRotateRight,
  ArrowUp,
  CircleCheck,
  CodeMerge,
  FileText,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useIsFetching, useQueryClient } from '@tanstack/react-query';

import {
  gitKeys,
  useGitCurrentBranch,
  useGitFetch,
  useGitPull,
  useGitPush,
  useGitStatus,
  useGitSummary,
} from '@/app/hooks/api/git';
import { useI18n } from '@/app/hooks/i18n';
import { toastPromise } from '@/app/lib/toast';
import { useSidePanelStore } from '@/app/stores/side-panel-store';

export function BranchHeader({ directory }: { directory: string }) {
  const { t } = useI18n();
  const { data: statusData } = useGitStatus(directory);
  const { data: branchData } = useGitCurrentBranch(directory);
  const { data: summaryData } = useGitSummary(directory);

  const pull = useGitPull();
  const push = useGitPush();
  const fetch = useGitFetch();

  const status = statusData as
    | {
        tracking?: string | null;
        ahead?: number;
        behind?: number;
        isClean?: boolean;
      }
    | null
    | undefined;

  const branch =
    (branchData as { currentBranch?: string | null } | null | undefined)
      ?.currentBranch ?? '—';

  const summary =
    (
      summaryData as {
        summary?: Array<{ additions: number; deletions: number }>;
      }
    )?.summary ?? [];
  const additions = summary.reduce((sum, entry) => sum + entry.additions, 0);
  const deletions = summary.reduce((sum, entry) => sum + entry.deletions, 0);
  const changeCount = summary.length;

  const busy = pull.isPending || push.isPending || fetch.isPending;

  const run = (
    mutation: { mutateAsync: (input: any) => Promise<unknown> },
    label: string,
  ) =>
    toastPromise(mutation.mutateAsync({ directory }), {
      loading: label,
      success: t.gitPanel.operationComplete(label),
      error: (error) => error.message || t.gitPanel.operationFailed(label),
    });

  return (
    <div className='border-separator shrink-0 border-b px-3 py-2'>
      <div className='flex items-center gap-2'>
        <Icon data={CodeMerge} size={14} className='text-accent shrink-0' />
        <span className='min-w-0 flex-1 truncate text-sm font-medium'>
          {branch}
        </span>

        {typeof status?.ahead === 'number' && status.ahead > 0 && (
          <Chip size='sm' variant='soft' color='accent'>
            <Icon data={ArrowUp} size={10} />
            {status.ahead}
          </Chip>
        )}
        {typeof status?.behind === 'number' && status.behind > 0 && (
          <Chip size='sm' variant='soft' color='warning'>
            <Icon data={ArrowDown} size={10} />
            {status.behind}
          </Chip>
        )}

        <div className='flex shrink-0 items-center gap-0.5'>
          <Tooltip>
            <Tooltip.Trigger>
              <IconButton
                isDisabled={busy}
                aria-label={t.gitPanel.pull}
                onPress={() => run(pull, t.gitPanel.pull)}
              >
                <Icon data={ArrowDown} />
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Content>{t.gitPanel.pull}</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger>
              <IconButton
                isDisabled={busy}
                aria-label={t.gitPanel.push}
                onPress={() => run(push, t.gitPanel.push)}
              >
                <Icon data={ArrowUp} />
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Content>{t.gitPanel.push}</Tooltip.Content>
          </Tooltip>
          <Tooltip>
            <Tooltip.Trigger>
              <IconButton
                isDisabled={busy}
                aria-label={t.gitPanel.fetch}
                onPress={() => run(fetch, t.gitPanel.fetch)}
              >
                <Icon
                  data={ArrowsRotateRight}
                  className={cn(fetch.isPending && 'animate-spin')}
                />
              </IconButton>
            </Tooltip.Trigger>
            <Tooltip.Content>{t.gitPanel.fetch}</Tooltip.Content>
          </Tooltip>
          <GitRefreshButton directory={directory} />
        </div>
      </div>

      {status?.tracking && (
        <div className='text-muted mt-0.5 truncate pl-5 text-xs'>
          → {status.tracking}
        </div>
      )}

      <SummaryStrip
        changeCount={changeCount}
        additions={additions}
        deletions={deletions}
        clean={changeCount === 0}
      />
    </div>
  );
}

function SummaryStrip({
  changeCount,
  additions,
  deletions,
  clean,
}: {
  changeCount: number;
  additions: number;
  deletions: number;
  clean: boolean;
}) {
  const { t } = useI18n();
  const setActiveNavItem = useSidePanelStore((s) => s.setActiveNavItem);

  return (
    <button
      type='button'
      onClick={() => setActiveNavItem('changes')}
      className='border-separator bg-default/30 hover:bg-default/60 mt-2 flex w-full items-center gap-2 rounded-md border px-2 py-1.5 text-xs transition-colors'
    >
      <Icon
        data={clean ? CircleCheck : FileText}
        size={12}
        className={cn('shrink-0', clean ? 'text-success' : 'text-muted')}
      />
      <span className='min-w-0 flex-1 truncate text-left'>
        {clean
          ? t.changesPanel.workingTreeClean
          : t.changesPanel.changeCount(changeCount)}
      </span>
      {additions > 0 && (
        <span className='text-success shrink-0 tabular-nums'>+{additions}</span>
      )}
      {deletions > 0 && (
        <span className='text-danger shrink-0 tabular-nums'>-{deletions}</span>
      )}
    </button>
  );
}

function GitRefreshButton({ directory }: { directory: string }) {
  const { t } = useI18n();
  const queryClient = useQueryClient();
  const isFetching = useIsFetching({ queryKey: gitKeys.all(directory) }) > 0;

  return (
    <Tooltip>
      <Tooltip.Trigger>
        <IconButton
          aria-label={t.gitPanel.refresh}
          onPress={() => {
            void queryClient.invalidateQueries({
              queryKey: gitKeys.all(directory),
            });
          }}
        >
          <Icon
            data={ArrowRotateLeft}
            className={cn(isFetching && 'animate-spin')}
          />
        </IconButton>
      </Tooltip.Trigger>
      <Tooltip.Content>{t.gitPanel.refresh}</Tooltip.Content>
    </Tooltip>
  );
}
