import { Typography } from '@aero/ui';
import { CircleTree, File } from '@gravity-ui/icons';
import { useMemo } from 'react';

import { StatusSectionHandle } from '@/app/components/status-panel/sortable-status-section';
import {
  useGitCurrentBranch,
  useGitErrorCode,
  useGitSummary,
} from '@/app/hooks/api/git';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useWorkspacesKeys } from '@/app/hooks/api/workspaces';
import { useI18n } from '@/app/hooks/i18n';
import { getLastPathName } from '@/app/lib/file';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function ProjectStatus() {
  const isVisible = useStatusPanelStore((state) => state.visibleItems.project);

  if (!isVisible) return null;

  return <ProjectStatusContent />;
}

export function ProjectStatusContent() {
  const directory = useSessionDirectory();

  if (!directory) return null;

  return (
    <div className='p-3'>
      <ProjectStatusHeader directory={directory} />
      <ProjectStatusBody directory={directory} />
    </div>
  );
}

function ProjectStatusBody({ directory }: { directory: string }) {
  const { data: error } = useGitErrorCode(directory);
  const { t } = useI18n();

  if (error?.code === 'INVALID_GIT_REPOSITORY') {
    return (
      <Typography type='body-xs' color='muted'>
        {t.workspace.noGitRepository}
      </Typography>
    );
  }

  return (
    <>
      <CurrentBranch directory={directory} />
      <FilesChanged directory={directory} />
    </>
  );
}

function ProjectStatusHeader({ directory }: { directory: string }) {
  const { data: keys } = useWorkspacesKeys();
  const { t } = useI18n();

  const workspaceTitle = keys?.[directory]?.name ?? getLastPathName(directory);

  return (
    <StatusSectionHandle>
      <div className='mb-2 flex items-center justify-between gap-2'>
        <Typography type='body-sm' className='text-foreground font-medium'>
          {t.statusPanel.project}
        </Typography>
        <Typography type='body-xs' className='text-muted truncate'>
          {workspaceTitle}
        </Typography>
      </div>
    </StatusSectionHandle>
  );
}

function CurrentBranch({ directory }: { directory: string }) {
  const { data } = useGitCurrentBranch(directory);
  const branch = data?.currentBranch ?? null;

  if (!branch) return null;

  return (
    <div className='text-muted mb-2 flex items-center gap-2'>
      <CircleTree className='h-3.5 w-3.5' />
      <Typography type='body-xs' className='font-mono'>
        {branch}
      </Typography>
    </div>
  );
}

function FilesChanged({ directory }: { directory: string }) {
  const { data } = useGitSummary(directory);
  const { t } = useI18n();

  const summary = useMemo(() => data?.summary ?? [], [data]);

  if (!data) return null;

  const fileCount = summary.length;
  const totalAdditions = summary.reduce((acc, item) => acc + item.additions, 0);
  const totalDeletions = summary.reduce((acc, item) => acc + item.deletions, 0);

  return (
    <div className='flex items-center justify-between text-xs'>
      <div className='text-muted flex items-center gap-1.5'>
        <File className='h-3.5 w-3.5' />
        <span>{t.chatFeed.fileCountChanged(fileCount)}</span>
      </div>
      {totalAdditions || totalDeletions ? (
        <div className='flex gap-1.5'>
          <span className='text-success'>+{totalAdditions}</span>
          <span className='text-danger'>-{totalDeletions}</span>
        </div>
      ) : null}
    </div>
  );
}
