import { useLocation } from '@tanstack/react-router';
import { RefObject, useEffect, useRef } from 'react';

import { cn, PromptInput } from '@aero/ui';

import { ModelAgentDropdownTrigger } from '@/app/features/chat-page/chat-input/model-agent-dropdown';
import { ActiveSessionPromptInputWrapper } from '@/app/features/chat-page/chat-input/prompt-input-wrapper';
import { AutoAcceptPermissionsToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/auto-accept-permissions';
import { ChatInputExpandedToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/chat-input-expanded';
import { GoalModeToggleButton } from '@/app/features/chat-page/chat-input/toggle-buttons/goal-mode';
import { VariantsDropdown } from '@/app/features/chat-page/chat-input/variants-dropdown';
import { useChatInputExpanded } from '@/app/hooks/api/config';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useWindowSize } from '@/app/hooks/useWindowSize';

import { AgentDropdown } from './agent-dropdown';
import { FileAttachmentsButton } from './file-attachments-button';
import { ModelDropdown } from './model-dropdown';
import { SendButton } from './send-button';
import { VoiceInputButton } from './voice-input-button';

export function ChatInput({
  isDisabled,
  sessionId,
}: {
  isDisabled: boolean;
  sessionId: string;
}) {
  const isMobile = useWindowSize((size) => size.width < 768);

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const { pathname } = useLocation();

  useKeyPress(
    'i',
    () => {
      textareaRef.current?.focus();
    },
    {
      modifiers: {
        mod: true,
      },
    },
  );

  useEffect(() => {
    if (textareaRef.current && !isMobile) {
      textareaRef.current.focus();
    }
  }, [pathname, isMobile]);

  return (
    <ActiveSessionPromptInputWrapper
      key={pathname}
      isDisabled={isDisabled}
      onSubmit={() => {
        if (textareaRef.current) {
          textareaRef.current.style.height = '';
        }
      }}
    >
      <PromptInput.Shell className='@container relative'>
        <div className='absolute top-2 right-2'>
          <ChatInputExpandedToggleButton sessionId={sessionId} />
        </div>

        <PromptInput.Content>
          <ChatInputTextArea ref={textareaRef} sessionId={sessionId} />
        </PromptInput.Content>

        <PromptInput.Toolbar>
          <PromptInput.ToolbarStart className='items-end justify-start gap-1'>
            <FileAttachmentsButton isMobile={isMobile} />
            <AutoAcceptPermissionsToggleButton sessionId={sessionId} />
            <GoalModeToggleButton sessionId={sessionId} />
          </PromptInput.ToolbarStart>

          <PromptInput.ToolbarEnd>
            <div className='flex'>
              {!isDisabled && (
                <>
                  <div className='@md:hidden'>
                    <ModelAgentDropdownTrigger />
                  </div>
                  <div className='flex @max-md:hidden'>
                    <VariantsDropdown />
                    <ModelDropdown />
                    <AgentDropdown />
                  </div>
                </>
              )}
              <VoiceInputButton />
            </div>
            <SendButton />
          </PromptInput.ToolbarEnd>
        </PromptInput.Toolbar>
      </PromptInput.Shell>
    </ActiveSessionPromptInputWrapper>
  );
}

export function ChatInputTextArea({
  ref,
  sessionId,
  enabledClassName,
}: {
  ref: RefObject<HTMLTextAreaElement | null>;
  sessionId: string;
  enabledClassName?: string;
}) {
  const { data } = useChatInputExpanded(sessionId);

  const enabled = data?.value ?? false;

  useEffect(() => {
    if (!enabled && ref.current && ref.current.innerHTML.trim().length === 0) {
      ref.current.style.removeProperty('height');
    }
  }, [enabled]);

  return (
    <PromptInput.TextArea
      ref={ref}
      className={cn(
        enabled
          ? (enabledClassName ?? 'min-h-[calc(100svh-156px)]')
          : '@max-lg:min-h-18',
      )}
      placeholder='@ for files/agents; / for commands and skills; ! for shell; # for snippets'
    />
  );
}
