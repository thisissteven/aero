import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { WorkspacesDropdown } from '@/app/features/new-session-page/workspaces-dropdown';
import { WorktreesDropdown } from '@/app/features/new-session-page/worktrees-dropdown';

export function WorkspaceWorktreeDropdowns() {
  const state = useNewSessionStore((state) => state.state);

  if (state === 'chat') return null;

  return (
    <div className='flex w-full justify-start gap-2'>
      <WorkspacesDropdown />
      <WorktreesDropdown />
    </div>
  );
}
