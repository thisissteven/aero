import { cn, PromptInput } from '@aero/ui';
import { useState } from 'react';

import {
  getComposerSession,
  useComposerStore,
} from '@/app/components/smart-composer/smart-composer-store';
import { AgentDropdown } from '@/app/features/chat-page/chat-input/agent-dropdown';
import { AttachmentsButton } from '@/app/features/chat-page/chat-input/attachments-button';
import { FileDropZone } from '@/app/features/chat-page/chat-input/file-attachments/file-drop-zone';
import { ModelAgentDropdownSheet } from '@/app/features/chat-page/chat-input/models/model-agent/model-agent-dropdown';
import { ModelAgentDropdownTrigger } from '@/app/features/chat-page/chat-input/models/model-agent/model-agent-dropdown-trigger';
import { ModelDropdown } from '@/app/features/chat-page/chat-input/models/model-dropdown';
import { NewSessionPromptInputWrapper } from '@/app/features/chat-page/chat-input/prompt-input-wrapper';
import { SendButton } from '@/app/features/chat-page/chat-input/send-button';
import { AutoAcceptPermissionsToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/auto-accept-permissions';
import { ChatInputExpandedToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/chat-input-expanded';
import { GoalModeToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/goal-mode';
import { VariantsDropdown } from '@/app/features/chat-page/chat-input/variants-dropdown';
import { ActivitySummaryCard } from '@/app/features/new-session-page/activity-summary';
import { ChatWorkToggle } from '@/app/features/new-session-page/chat-work-toggle';
import { PromptInputContent } from '@/app/features/new-session-page/prompt-input-content';
import { WorkspaceWorktreeDropdownWrapper } from '@/app/features/new-session-page/workspace-worktree-dropdowns';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { useIsMounted } from '@/app/hooks/useIsMounted';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import { NEW_SESSION_PAGE_SESSION_ID } from '@/server/shared';

export function NewSessionPage() {
  const isMounted = useIsMounted();

  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const sessionId = useSessionId();
  const isChatInputExpanded = useChatInputExpanded();
  const isShellMode = useComposerStore(
    (state) => getComposerSession(state, sessionId).mode === 'shell',
  );

  return (
    <FileDropZone>
      <div
        ref={setContainer}
        className='@container relative h-full overflow-hidden'
      >
        {container && <ModelAgentDropdownSheet container={container} />}
        <div className='relative flex h-[calc(100svh-var(--chat-navbar-height,56px))] flex-col overflow-hidden'>
          <ChatWorkToggle />
          <div
            className={cn(
              'flex min-h-0 flex-1 flex-col',
              isMounted ? 'blur-0 opacity-100' : 'opacity-0 blur-sm',
              'motion-safe:transition motion-safe:duration-200 motion-safe:ease-in',
            )}
          >
            <div
              className={cn(
                'mx-auto flex min-h-0 w-full max-w-[920px] flex-1 flex-col items-center px-4 pb-2',
                !isChatInputExpanded && 'pt-14',
              )}
            >
              <div className='flex min-h-0 w-full flex-1 items-center justify-center'>
                <ActivitySummaryCard />
              </div>

              <div className='w-full shrink-0'>
                <WorkspaceWorktreeDropdownWrapper>
                  <NewSessionPromptInputWrapper>
                    <PromptInput.Shell
                      className={cn(
                        'border-separator @container relative border',
                        isShellMode && 'border-separator dark:border-separator',
                      )}
                    >
                      <div className='absolute top-2 right-2'>
                        <ChatInputExpandedToggleButton
                          sessionId={NEW_SESSION_PAGE_SESSION_ID}
                        />
                      </div>

                      <PromptInputContent />

                      <PromptInput.Toolbar>
                        <PromptInput.ToolbarStart className='gap-1'>
                          <AttachmentsButton />
                          <AutoAcceptPermissionsToggleButton
                            sessionId={NEW_SESSION_PAGE_SESSION_ID}
                          />
                          <GoalModeToggleButton
                            sessionId={NEW_SESSION_PAGE_SESSION_ID}
                          />
                        </PromptInput.ToolbarStart>

                        <PromptInput.ToolbarEnd>
                          <div className='flex'>
                            <div className='@md:hidden'>
                              <ModelAgentDropdownTrigger />
                            </div>
                            <div className='flex @max-md:hidden'>
                              <ModelDropdown />
                              <VariantsDropdown />
                              <AgentDropdown />
                            </div>
                          </div>
                          <SendButton />
                        </PromptInput.ToolbarEnd>
                      </PromptInput.Toolbar>
                    </PromptInput.Shell>
                  </NewSessionPromptInputWrapper>
                </WorkspaceWorktreeDropdownWrapper>
              </div>
            </div>
          </div>
        </div>
      </div>
    </FileDropZone>
  );
}
