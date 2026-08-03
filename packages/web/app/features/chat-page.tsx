'use client';

import { ScrollShadow } from '@aero/ui';

import { ChatComposer } from '../components/chat-composer';
import { MessageActions } from '../components/message-actions';
import type { ChatThread } from '../data/chat';

export interface ChatPageProps {
  thread: ChatThread;
}

export function ChatPage({ thread }: ChatPageProps) {
  return (
    <div className='flex h-[calc(100svh-var(--chat-navbar-height,64px))] flex-col overflow-hidden'>
      <ScrollShadow className='flex min-h-0 flex-1 flex-col-reverse overflow-y-auto overscroll-contain'>
        <div className='mx-auto flex w-full max-w-[714px] flex-col gap-8 px-4 pt-10 pb-6'>
          {thread.messages.map((message) =>
            message.role === 'user' ? (
              <div key={message.id} className='flex flex-col items-end'>
                <div className='bg-default rounded-xl px-4 py-3'>
                  <p className='text-foreground text-base'>{message.text}</p>
                </div>
              </div>
            ) : (
              <div
                key={message.id}
                className='flex flex-col items-start gap-2 py-2 pr-12 pl-2'
              >
                {message.text ? (
                  <p className='text-foreground text-base leading-relaxed'>
                    {message.text}
                  </p>
                ) : null}
                {message.listItems?.length ? (
                  <ol className='text-foreground list-decimal space-y-1 pl-6 text-base leading-relaxed'>
                    {message.listItems.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ol>
                ) : null}
                {message.image ? (
                  <img
                    alt={message.image.alt}
                    className='size-[341px] rounded-2xl object-cover'
                    src={message.image.src}
                  />
                ) : null}
                {message.actions ? (
                  <MessageActions variant={message.actions} />
                ) : null}
              </div>
            ),
          )}
        </div>
      </ScrollShadow>

      <div className='bg-background shrink-0 px-4 pt-3 pb-4'>
        <div className='mx-auto flex w-full max-w-[714px] flex-col items-center gap-1'>
          <ChatComposer className='w-full' modelId={thread.modelId} />
          <p className='text-muted text-center text-xs'>
            AI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}
