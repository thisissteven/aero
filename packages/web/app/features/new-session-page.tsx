import { useEffect, useRef } from 'react';

import { cn, PromptInput, TextShimmer } from '@aero/ui';

import { AgentDropdown } from '@/app/features/chat-page/chat-input/agent-dropdown';
import { FileAttachmentsButton } from '@/app/features/chat-page/chat-input/file-attachments-button';
import { ModelDropdown } from '@/app/features/chat-page/chat-input/model-dropdown';
import { NewSessionPromptInputWrapper } from '@/app/features/chat-page/chat-input/prompt-input-wrapper';
import { SendButton } from '@/app/features/chat-page/chat-input/send-button';
import { VoiceInputButton } from '@/app/features/chat-page/chat-input/voice-input-button';
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

  return (
    <div
      className={cn(
        'relative flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col justify-center overflow-hidden',
        'motion-safe:transition motion-safe:duration-200 motion-safe:ease-in',
        isMounted ? 'blur-0 opacity-100' : 'opacity-0 blur-sm',
      )}
    >
      <div className='mx-auto flex min-h-[520px] w-full max-w-[920px] flex-col items-center justify-center gap-6 px-4'>
        <div className='flex flex-col items-center gap-2 text-center'>
          <h2 className='text-foreground text-3xl font-normal tracking-tight'>
            Build something useful with{' '}
            <TextShimmer className='shimmer-accent font-medium tracking-normal'>
              Aero
            </TextShimmer>
          </h2>
          <p className='text-muted text-sm'>
            Start with a prompt, add files, or pick a suggestion to shape the
            first response.
          </p>
        </div>

        <NewSessionPromptInputWrapper>
          <PromptInput.Shell className='shadow'>
            <PromptInput.Content>
              <PromptInput.TextArea
                ref={textareaRef}
                className='min-h-18'
                placeholder='@ for files/agents; / for commands and skills; ! for shell; # for snippets'
              />
            </PromptInput.Content>

            <PromptInput.Toolbar>
              <PromptInput.ToolbarStart className='items-end justify-start gap-2'>
                <FileAttachmentsButton isMobile={isMobile} />
              </PromptInput.ToolbarStart>

              <PromptInput.ToolbarEnd>
                <ModelDropdown />

                <AgentDropdown />

                <VoiceInputButton />

                <SendButton />
              </PromptInput.ToolbarEnd>
            </PromptInput.Toolbar>
          </PromptInput.Shell>
        </NewSessionPromptInputWrapper>
      </div>
    </div>
  );
}
