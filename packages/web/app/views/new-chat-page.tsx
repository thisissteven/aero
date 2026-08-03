'use client';

import { ArrowRight } from '@gravity-ui/icons';

import { ChatComposer } from '../components/chat-composer';
import { SUGGESTED_PROMPTS } from '../data/chat';

export function NewChatPage() {
  return (
    <div className='flex h-[calc(100svh-var(--chat-navbar-height,56px))] flex-col overflow-hidden'>
      <div className='min-h-0 flex-1 overflow-y-auto overscroll-contain'>
        <div className='mx-auto flex min-h-full w-full max-w-[714px] flex-col justify-center gap-8 px-4 py-10'>
          <div className='flex flex-col gap-2'>
            <h2 className='text-foreground text-2xl font-semibold tracking-tight'>
              What do you want to work on?
            </h2>
            <p className='text-muted text-sm'>
              Ask a question or start from one of the suggestions below. This is
              a mock chat so nothing will actually be sent.
            </p>
          </div>

          <div className='grid w-full grid-cols-1 gap-2 sm:grid-cols-2'>
            {SUGGESTED_PROMPTS.map((prompt) => (
              <button
                key={prompt}
                className='border-default text-foreground hover:bg-default/40 group flex w-full items-start justify-between gap-3 rounded-xl border bg-transparent px-4 py-3 text-left text-sm leading-snug transition-colors'
                type='button'
              >
                <span className='min-w-0 flex-1 text-pretty'>{prompt}</span>
                <ArrowRight className='text-muted mt-0.5 size-4 shrink-0 opacity-0 transition-opacity group-hover:opacity-100' />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className='bg-background shrink-0 border-t px-4 pt-3 pb-4'>
        <div className='mx-auto flex w-full max-w-[714px] flex-col items-center gap-4'>
          <ChatComposer className='w-full' />
          <p className='text-muted text-center text-xs'>
            AI can make mistakes. Check important info.
          </p>
        </div>
      </div>
    </div>
  );
}
