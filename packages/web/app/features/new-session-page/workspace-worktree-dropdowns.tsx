import { ReactNode } from 'react';

import { cn } from '@aero/ui';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { WorkspacesDropdown } from '@/app/features/new-session-page/workspaces-dropdown';
import { WorktreesDropdown } from '@/app/features/new-session-page/worktrees-dropdown';

export function WorkspaceWorktreeDropdownWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const state = useNewSessionStore((state) => state.state);

  const isChat = state === 'chat';

  return (
    <div className='mx-auto w-full max-w-[720px] space-y-1'>
      <div
        className={cn(
          'grid transition-[grid-template-rows,opacity] duration-200 ease-out',
          isChat ? 'grid-rows-[0fr] opacity-0' : 'grid-rows-[1fr] opacity-100',
        )}
      >
        <div className='min-h-0 overflow-hidden'>
          <div className='flex w-full justify-start gap-2 pb-1'>
            <WorkspacesDropdown />
            <WorktreesDropdown />
          </div>
        </div>
      </div>

      <div
        className={cn(
          'transition-transform duration-200 ease-out',
          isChat ? '-translate-y-3' : 'translate-y-0',
        )}
      >
        {children}
      </div>
    </div>
  );
}
