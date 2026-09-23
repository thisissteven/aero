import { Typography } from '@aero/ui';
import { CircleTree, File } from '@gravity-ui/icons';
import { useMemo } from 'react';
import { useGitStatus } from '@/app/hooks/api/git';
import { useSession } from '@/app/hooks/api/sessions';
import { useWorkspacesKeys } from '@/app/hooks/api/workspaces';
import { getLastPathName } from '@/app/lib/file';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

// ---------------------------------------------------------------------------
// Shared shape for deriving a diff summary from the status endpoint
// ---------------------------------------------------------------------------

interface DiffStat {
  path: string;
  additions: number;
  deletions: number;
}

interface DiffSummaryEntry {
  path: string;
  additions: number;
  deletions: number;
}

interface GitStatusShape {
  currentBranch?: string | null;
  not_added?: string[];
  diffStats?: {
    staged?: Record<string, DiffStat>;
    working?: Record<string, DiffStat>;
  };
}

function deriveSummary(
  status: GitStatusShape | null | undefined,
): DiffSummaryEntry[] {
  if (!status) return [];

  const map = new Map<string, DiffSummaryEntry>();

  const merge = (stat: DiffStat) => {
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

  for (const bucket of [status.diffStats?.staged, status.diffStats?.working]) {
    if (!bucket) continue;
    for (const stat of Object.values(bucket)) merge(stat);
  }

  for (const untracked of status.not_added ?? []) {
    if (!map.has(untracked)) {
      map.set(untracked, { path: untracked, additions: 0, deletions: 0 });
    }
  }

  return Array.from(map.values());
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function ProjectStatus() {
  const isVisible = useStatusPanelStore((state) => state.visibleItems.mcp);

  if (!isVisible) return null;

  return <ProjectStatusContent />;
}

export function ProjectStatusContent() {
  const sessionId = useSessionId();
  const { data: session } = useSession(undefined, sessionId);

  if (!session) return null;

  return (
    <div className='border-separator border-b p-3'>
      <ProjectStatusHeader workspace={session.workspace} />
      <CurrentBranch workspace={session.workspace} />
      <FilesChanged workspace={session.workspace} />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Sub-views
// ---------------------------------------------------------------------------

function ProjectStatusHeader({ workspace }: { workspace: string }) {
  const { data: keys } = useWorkspacesKeys();

  const workspaceTitle = keys?.[workspace]?.name ?? getLastPathName(workspace);

  return (
    <div className='mb-2 flex items-center justify-between gap-2'>
      <Typography type='body-sm' className='text-foreground font-medium'>
        Project
      </Typography>
      <Typography type='body-xs' className='text-muted truncate'>
        {workspaceTitle}
      </Typography>
    </div>
  );
}

function CurrentBranch({ workspace }: { workspace: string }) {
  const { data: statusData } = useGitStatus(workspace);

  const branch =
    (statusData as GitStatusShape | null | undefined)?.currentBranch ?? null;

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

function FilesChanged({ workspace }: { workspace: string }) {
  const { data: statusData } = useGitStatus(workspace);

  const summary = useMemo(
    () => deriveSummary(statusData as GitStatusShape | null | undefined),
    [statusData],
  );

  if (!statusData) return null;

  const fileCount = summary.length;
  const totalAdditions = summary.reduce((acc, item) => acc + item.additions, 0);
  const totalDeletions = summary.reduce((acc, item) => acc + item.deletions, 0);

  return (
    <div className='flex items-center justify-between text-xs'>
      <div className='text-muted flex items-center gap-1.5'>
        <File className='h-3.5 w-3.5' />
        <span>{fileCount} files changed</span>
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
