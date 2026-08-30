import { useEffect, useRef, useState } from 'react';

import { cn, PromptInput } from '@aero/ui';

import { AgentDropdown } from '@/app/features/chat-page/chat-input/agent-dropdown';
import { FileAttachmentsButton } from '@/app/features/chat-page/chat-input/file-attachments-button';
import {
  ModelAgentDropdownSheet,
  ModelAgentDropdownTrigger,
} from '@/app/features/chat-page/chat-input/model-agent-dropdown';
import { ModelDropdown } from '@/app/features/chat-page/chat-input/model-dropdown';
import { NewSessionPromptInputWrapper } from '@/app/features/chat-page/chat-input/prompt-input-wrapper';
import { SendButton } from '@/app/features/chat-page/chat-input/send-button';
import { VoiceInputButton } from '@/app/features/chat-page/chat-input/voice-input-button';
import { ChatWorkToggle } from '@/app/features/new-session-page/chat-work-toggle';
import { HeroText } from '@/app/features/new-session-page/hero-text';
import { WorkspaceWorktreeDropdownWrapper } from '@/app/features/new-session-page/workspace-worktree-dropdowns';
import { useIsMounted } from '@/app/hooks/useIsMounted';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useWindowSize } from '@/app/hooks/useWindowSize';

export function NewSessionPage() {
  const isMounted = useIsMounted();
  const isMobile = useWindowSize((size) => size.width < 768);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useKeyPress(
    'i',
    () => {
      if (textareaRef.current) {
        textareaRef.current.focus();
      }
    },
    {
      modifiers: { mod: true },
    },
  );

  useEffect(() => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  }, [isMobile]);

  const [container, setContainer] = useState<HTMLDivElement | null>(null);

  return (
    <div ref={setContainer} className='relative h-full overflow-hidden'>
      {container && <ModelAgentDropdownSheet container={container} />}
      <div className='relative h-[calc(100svh-var(--chat-navbar-height,56px))] overflow-hidden'>
        <ChatWorkToggle />
        <div
          className={cn(
            'flex flex-col justify-center',
            isMounted ? 'blur-0 opacity-100' : 'opacity-0 blur-sm',
            'motion-safe:transition motion-safe:duration-200 motion-safe:ease-in',
          )}
        >
          <div className='mx-auto flex min-h-[520px] w-full max-w-[920px] flex-col items-center justify-center gap-6 px-4'>
            <HeroText />

            <WorkspaceWorktreeDropdownWrapper>
              <NewSessionPromptInputWrapper
                onSubmit={() => {
                  if (textareaRef.current) {
                    textareaRef.current.style.height = '';
                  }
                }}
              >
                <PromptInput.Shell className='@container shadow'>
                  <PromptInput.Content>
                    <PromptInput.TextArea
                      ref={textareaRef}
                      className='@max-lg:min-h-18'
                      placeholder='@ for files/agents; / for commands and skills; ! for shell; # for snippets'
                    />
                  </PromptInput.Content>

                  <PromptInput.Toolbar>
                    <PromptInput.ToolbarStart className='items-end justify-start gap-2'>
                      <FileAttachmentsButton isMobile={isMobile} />
                    </PromptInput.ToolbarStart>

                    <PromptInput.ToolbarEnd>
                      <div className='flex'>
                        <div className='@md:hidden'>
                          <ModelAgentDropdownTrigger />
                        </div>
                        <div className='flex @max-md:hidden'>
                          <ModelDropdown />
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
