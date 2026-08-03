import type { ChatThread } from '../data/chat';

export interface ChatPageProps {
  thread: ChatThread;
}

import { useState } from 'react';

import { ChatConversation, PromptInput } from '@aero/ui';

import { MessageView } from '@/components/message-view';

export function ChatPage({ thread }: ChatPageProps) {
  const [value, setValue] = useState('');

  function send() {
    const text = value.trim();

    if (!text) return;

    setValue('');

    // call your API here
  }

  return (
    <div className='flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden'>
      <ChatConversation>
        <ChatConversation.Content className='mx-auto flex w-full max-w-[800px] flex-col gap-8 px-4 pt-10 pb-6'>
          {thread.messages.map((message) => (
            <MessageView key={message.id} message={message} />
          ))}
        </ChatConversation.Content>
        <ChatConversation.ScrollButton
          aria-label='Scroll to bottom'
          tooltip='Scroll to bottom'
        />
        <ChatConversation.ScrollAnchor />
      </ChatConversation>

      <div className='bg-background shrink-0 px-4 pt-3 pb-4'>
        <div className='mx-auto w-full max-w-[714px]'>
          <PromptInput
            value={value}
            layout='stacked'
            onSubmit={send}
            onValueChange={setValue}
          >
            <PromptInput.Shell>
              <PromptInput.Content>
                <PromptInput.TextArea placeholder='What do you want to know?' />
              </PromptInput.Content>

              <PromptInput.Toolbar>
                <PromptInput.ToolbarEnd>
                  <PromptInput.Send />
                </PromptInput.ToolbarEnd>
              </PromptInput.Toolbar>
            </PromptInput.Shell>

            <PromptInput.Footer>
              AI can make mistakes. Check important info.
            </PromptInput.Footer>
          </PromptInput>
        </div>
      </div>
    </div>
  );
}
