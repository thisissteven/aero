import { CircleTree, File } from '@gravity-ui/icons';
import { useParams } from '@tanstack/react-router';

import { Typography } from '@aero/ui';

import { useGitCurrentBranch, useGitDiff } from '@/app/hooks/api/git';
import { useSession } from '@/app/hooks/api/sessions';
import { useWorkspacesKeys } from '@/app/hooks/api/workspaces';
import { getLastPathName } from '@/app/lib/file';

export function ProjectStatus() {
  const { sessionId } = useParams({ strict: false });
  const { data: session } = useSession(undefined, sessionId);
  const { data: currentBranch } = useGitCurrentBranch(session?.workspace);

  if (!currentBranch) return null;

  return (
    <div className='border-separator border-b p-3'>
      <ProjectStatusHeader />
      <CurrentBranch />
      <FilesChanged />
    </div>
  );
}

function ProjectStatusHeader() {
  const { sessionId } = useParams({ strict: false });
  const { data: session } = useSession(undefined, sessionId);
  const { data: keys } = useWorkspacesKeys();

  if (!session) return null;

  const workspaceTitle =
    keys?.[session.workspace]?.name ?? getLastPathName(session.workspace);

  return (
    <div className='mb-2 flex items-center justify-between gap-2'>
      <Typography type='body-sm' className='text-foreground font-semibold'>
        Project
      </Typography>
      <Typography type='body-xs' className='text-muted truncate font-mono'>
        {workspaceTitle}
      </Typography>
    </div>
  );
}

function CurrentBranch() {
  const { sessionId } = useParams({ strict: false });
  const { data: session } = useSession(undefined, sessionId);
  const { data: currentBranch } = useGitCurrentBranch(session?.workspace);

  if (!session || !currentBranch) return null;

  return (
    <div className='text-muted mb-2 flex items-center gap-2'>
      <CircleTree className='h-3.5 w-3.5' />
      <Typography type='body-xs' className='font-mono'>
        {currentBranch.currentBranch}
      </Typography>
    </div>
  );
}

function FilesChanged() {
  const { sessionId } = useParams({ strict: false });
  const { data: session } = useSession(undefined, sessionId);
  const { data: diffData } = useGitDiff(session?.workspace);

  if (!session || !diffData) return null;

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
    <div className='flex items-center justify-between text-xs'>
      <div className='text-muted flex items-center gap-1.5'>
        <File className='h-3.5 w-3.5' />
        <span>{fileCount} files changed</span>
      </div>
      {totalAdditions || totalDeletions ? (
        <div className='flex gap-1.5 font-mono'>
          <span className='text-success'>+{totalAdditions}</span>
          <span className='text-danger'>-{totalDeletions}</span>
        </div>
      ) : null}
    </div>
  );
}
