import { CircleTree } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { useWorkspacesKeys } from '@/app/hooks/api/workspaces';
import { formatCompactRelativeTime } from '@/app/lib';
import { getLastPathName } from '@/app/lib/file';
import { AeroSessionSummary } from '@/server/services/harness/types';
import { isWorktree } from '@/server/shared';

export function SessionItemMetadata({
  session,
  time = true,
}: {
  session: AeroSessionSummary;
  time?: boolean;
}) {
  const { data: keys } = useWorkspacesKeys();

  if (!keys) return null;

  const isStandaloneSession =
    session.workspace.includes('.aero/workspaces') ||
    session.workspace.includes('.config/openchamber');
  const workspaceTitle =
    keys[session.workspace]?.name ?? getLastPathName(session.workspace);

  return (
    // 1. Added `min-w-0` and `w-full` to allow flex children to shrink
    <div className='text-muted flex w-full min-w-0 items-center gap-1 text-xs'>
      {/* 2. `shrink-0` keeps time/prefix visible */}
      <span className='shrink-0'>
        {time
          ? formatCompactRelativeTime(session.updatedAt, true) + ' at '
          : session.parentId
            ? 'Subagent session at '
            : ' at '}
      </span>

      {!isWorktree(session.workspace) && (
        // 3. `truncate` + `min-w-0` allows the workspace title to cut off
        <span className='min-w-0 truncate font-bold'>
          {isStandaloneSession ? 'Standalone Session' : workspaceTitle}
          {session.readOnly && ' (read only)'}
        </span>
      )}

      {isWorktree(session.workspace) && (
        // 4. Added `min-w-0` to nested flex wrapper
        <div className='flex min-w-0 items-center gap-1'>
          <span className='shrink-0'>
            {isStandaloneSession ? 'Standalone Session' : workspaceTitle}
          </span>
          <Icon className='shrink-0' data={CircleTree} size={12} />
          <span className='min-w-0 truncate font-bold'>
            {getLastPathName(session.workspace)}
            {session.readOnly && ' (read only)'}
          </span>
        </div>
      )}

      {session.archived && (
        <span className='shrink-0 font-bold'>{' (archived)'}</span>
      )}
    </div>
  );
}
