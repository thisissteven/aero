import React, { useState } from 'react';

import { PromptInput } from '@aero/ui';

export function ChatInput({ isDisabled }: { isDisabled: boolean }) {
  const [value, setValue] = useState('');

  function send() {
    const text = value.trim();
    if (!text) return;
    setValue('');
  }
  return (
    <PromptInput
      value={value}
      layout='stacked'
      onSubmit={send}
      onValueChange={setValue}
      isDisabled={isDisabled}
    >
      <PromptInput.Shell className='shadow'>
        <PromptInput.Content>
          <PromptInput.TextArea placeholder='@ for files/agents; / for commands and skills; ! for shell; # for snippets' />
        </PromptInput.Content>
        <PromptInput.Toolbar>
          <PromptInput.ToolbarEnd>
            <PromptInput.Send />
          </PromptInput.ToolbarEnd>
        </PromptInput.Toolbar>
      </PromptInput.Shell>
    </PromptInput>
  );
}
