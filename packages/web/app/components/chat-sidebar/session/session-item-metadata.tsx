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
    <div className='text-muted flex items-center gap-1 text-xs'>
      <span className='shrink-0'>
        {time
          ? formatCompactRelativeTime(session.updatedAt, true) + ' at '
          : session.parentId
            ? 'Subagent session at '
            : ' at '}
      </span>
      {!isWorktree(session.workspace) && (
        <span className='truncate font-bold'>
          {isStandaloneSession ? 'Standalone Session' : workspaceTitle}
          {session.readOnly && ' (read only)'}
        </span>
      )}
      {isWorktree(session.workspace) && (
        <div className='flex items-center gap-1'>
          {isStandaloneSession ? 'Standalone Session' : workspaceTitle}
          <Icon data={CircleTree} size={12} />
          <span className='truncate font-bold'>
            {getLastPathName(session.workspace)}
            {session.readOnly && ' (read only)'}
          </span>
        </div>
      )}
      {session.archived && (
        <span className='truncate font-bold'>{' (archived)'}</span>
      )}
    </div>
  );
}
