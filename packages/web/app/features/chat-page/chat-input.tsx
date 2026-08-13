import { File, Folder, Microphone, Picture, Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import React, { useState } from 'react';

import { PromptInput } from '@aero/ui';

import { CollapsibleActions } from '@/app/components/collapsible-actions';

export function ChatInput({ isDisabled }: { isDisabled: boolean }) {
  const [value, setValue] = useState('');

  function send() {
    const text = value.trim();
    if (!text) return;
    setValue('');
  }
  return (
    <PromptInput
      className='w-full max-w-[780px]'
      value={value}
      onValueChange={setValue}
      onSubmit={() => send}
      isDisabled={isDisabled}
    >
      <PromptInput.Shell className='shadow'>
        <PromptInput.Content>
          <PromptInput.TextArea
            className='min-h-19'
            placeholder='Describe an app, workflow, or interface...'
          />
        </PromptInput.Content>
        <PromptInput.Toolbar>
          <PromptInput.ToolbarStart className='items-end justify-start'>
            <CollapsibleActions
              expandBehavior='vertical'
              expandOrigin='trigger'
              gap={44}
            >
              <CollapsibleActions.Trigger>
                <PromptInput.Action aria-label='Add context'>
                  <Icon aria-hidden data={Plus} />
                </PromptInput.Action>
              </CollapsibleActions.Trigger>
              <CollapsibleActions.Contents>
                <PromptInput.Action aria-label='Attach Files'>
                  <Icon aria-hidden data={File} />
                </PromptInput.Action>
                <PromptInput.Action aria-label='Attach Images'>
                  <Icon aria-hidden data={Picture} />
                </PromptInput.Action>
                <PromptInput.Action aria-label='Attach Folders'>
                  <Icon aria-hidden data={Folder} />
                </PromptInput.Action>
              </CollapsibleActions.Contents>
            </CollapsibleActions>
            <PromptInput.Action aria-label='Use voice'>
              <Icon aria-hidden data={Microphone} />
            </PromptInput.Action>
          </PromptInput.ToolbarStart>
          <PromptInput.ToolbarEnd>
            <PromptInput.Send />
          </PromptInput.ToolbarEnd>
        </PromptInput.Toolbar>
      </PromptInput.Shell>
    </PromptInput>
  );
}
