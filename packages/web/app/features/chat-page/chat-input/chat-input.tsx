import { useLocation } from '@tanstack/react-router';
import { useEffect, useRef, useState } from 'react';

import { PromptInput } from '@aero/ui';

import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useWindowSize } from '@/app/hooks/useWindowSize';

import { AgentDropdown } from './agent-dropdown';
import { FileAttachmentsButton } from './file-attachments-button';
import { ModelDropdown } from './model-dropdown';
import { SendButton } from './send-button';
import { VoiceInputButton } from './voice-input-button';

export function ChatInput({ isDisabled }: { isDisabled: boolean }) {
  const [value, setValue] = useState('');

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

  function send() {
    const text = value.trim();

    if (!text) {
      return;
    }

    console.log('Sending message:', text);

    setValue('');
  }

  return (
    <PromptInput
      className='w-full max-w-[780px]'
      value={value}
      onValueChange={setValue}
      onSubmit={send}
      isDisabled={isDisabled}
    >
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
    </PromptInput>
  );
}
