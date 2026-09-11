import { useState } from 'react';

import { cn, PromptInput } from '@aero/ui';

import { useComposerStore } from '@/app/components/smart-composer/smart-composer-store';
import { AgentDropdown } from '@/app/features/chat-page/chat-input/agent-dropdown';
import { FileAttachmentsButton } from '@/app/features/chat-page/chat-input/file-attachments-button';
import {
  ModelAgentDropdownSheet,
  ModelAgentDropdownTrigger,
} from '@/app/features/chat-page/chat-input/model-agent-dropdown';
import { ModelDropdown } from '@/app/features/chat-page/chat-input/model-dropdown';
import { NewSessionPromptInputWrapper } from '@/app/features/chat-page/chat-input/prompt-input-wrapper';
import { SendButton } from '@/app/features/chat-page/chat-input/send-button';
import { AutoAcceptPermissionsToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/auto-accept-permissions';
import { ChatInputExpandedToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/chat-input-expanded';
import { GoalModeToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/goal-mode';
import { VariantsDropdown } from '@/app/features/chat-page/chat-input/variants-dropdown';
import { VoiceInputButton } from '@/app/features/chat-page/chat-input/voice-input-button';
import { ChatWorkToggle } from '@/app/features/new-session-page/chat-work-toggle';
import { HeroText } from '@/app/features/new-session-page/hero-text';
import { PromptInputContent } from '@/app/features/new-session-page/prompt-input-content';
import { WorkspaceWorktreeDropdownWrapper } from '@/app/features/new-session-page/workspace-worktree-dropdowns';
import { useIsMounted } from '@/app/hooks/useIsMounted';
import { useWindowSize } from '@/app/hooks/useWindowSize';
import { NEW_SESSION_PAGE_SESSION_ID } from '@/server/shared';

export function NewSessionPage() {
  const isMounted = useIsMounted();
  const isMobile = useWindowSize((size) => size.width < 768);

  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  const isShellMode = useComposerStore((state) => state.mode === 'shell');

  return (
    <div
      ref={setContainer}
      className='@container relative h-full overflow-hidden'
    >
      {container && <ModelAgentDropdownSheet container={container} />}
      <div className='relative h-[calc(100svh-var(--chat-navbar-height,56px))] overflow-hidden py-2 @max-md:flex @max-md:flex-col @max-md:justify-between'>
        <ChatWorkToggle />
        <div
          className={cn(
            'h-full',
            isMounted ? 'blur-0 opacity-100' : 'opacity-0 blur-sm',
            'motion-safe:transition motion-safe:duration-200 motion-safe:ease-in',
          )}
        >
          <div className='mx-auto flex h-full w-full max-w-[920px] flex-col items-center justify-center gap-6 px-4 @max-md:justify-end'>
            <HeroText />

            <WorkspaceWorktreeDropdownWrapper>
              <NewSessionPromptInputWrapper>
                <PromptInput.Shell
                  className={cn(
                    'border-separator dark:border-separator/60 @container relative border',
                    isShellMode && 'border-accent/20 dark:border-accent/15',
                  )}
                >
                  <div className='absolute top-2 right-2'>
                    <ChatInputExpandedToggleButton
                      sessionId={NEW_SESSION_PAGE_SESSION_ID}
                    />
                  </div>

                  <PromptInputContent />

                  <PromptInput.Toolbar>
                    <PromptInput.ToolbarStart className='items-end justify-start gap-1'>
                      <FileAttachmentsButton isMobile={isMobile} />
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
                        <VoiceInputButton />
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
  );
}
