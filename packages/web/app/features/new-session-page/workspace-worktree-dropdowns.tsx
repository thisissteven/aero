import { cn } from '@aero/ui';
import { ReactNode } from 'react';
import { FileAttachments } from '@/app/features/chat-page/chat-input/file-attachments/file-attachments';
import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { WorkspacesDropdown } from '@/app/features/new-session-page/workspaces-dropdown';
import { WorktreesDropdown } from '@/app/features/new-session-page/worktrees-dropdown';
import { useChatInputExpanded } from '@/app/hooks/api/settings';

export function WorkspaceWorktreeDropdownWrapper({
  children,
}: {
  children: ReactNode;
}) {
  const state = useNewSessionStore((state) => state.state);
  const isChatInputExpanded = useChatInputExpanded();

  const isChat = state === 'chat';

  return (
    <div
      className={cn(
        'mx-auto w-full max-w-[720px]',
        isChat && isChatInputExpanded && 'mb-8',
      )}
    >
      <FileAttachments />

      <div
        className={cn(
          'duration-200',
          isChat ? 'translate-y-full opacity-0' : 'translate-y-0 opacity-100',
        )}
        inert={isChat}
      >
        <div className='min-h-0 overflow-hidden mb-1'>
          <div className='flex w-full justify-start gap-2 pb-1 px-2'>
            <WorkspacesDropdown />
            <WorktreesDropdown />
          </div>
        </div>
      </div>

      {children}
    </div>
  );
}
