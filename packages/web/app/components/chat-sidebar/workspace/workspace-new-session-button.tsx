import { Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useNavigate } from '@tanstack/react-router';

import { Sidebar } from '@aero/ui';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import {
  AeroWorkspaceSummary,
  AeroWorktreeSummary,
} from '@/server/services/harness/types';

export function WorkspaceNewSessionButton({
  workspace,
  worktree,
}: {
  workspace: AeroWorkspaceSummary;
  worktree?: AeroWorktreeSummary;
}) {
  const setSelectedWorkspace = useNewSessionStore(
    (state) => state.setSelectedWorkspace,
  );

  const setSelectedWorktree = useNewSessionStore(
    (state) => state.setSelectedWorktree,
  );

  const setState = useNewSessionStore((state) => state.setState);

  const navigate = useNavigate();

  return (
    <Sidebar.MenuAction
      aria-label='Actions'
      className='group'
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setState('work');
        setSelectedWorkspace(workspace);
        if (worktree) {
          setSelectedWorktree(worktree.directory);
        }
        navigate({ to: '/new' });
      }}
    >
      <Icon
        data={Plus}
        className='opacity-50 transition-opacity group-hover:opacity-80'
        style={{ width: 12, height: 12 }}
      />
    </Sidebar.MenuAction>
  );
}
