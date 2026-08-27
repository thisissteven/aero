// app/components/session-chat/session-chat.tsx
import { ArrowUp, Square } from '@gravity-ui/icons';
import { useMemo, useState } from 'react';

import { MessageList } from './message-list';
import {
  useAbortSession,
  useSendMessage,
  useSessionMessagesQuery,
  useSessionStatusQuery,
  useSessionStream,
} from './session-chat';
import { createSessionChatStore } from './session-chat-store';
import { useStickyScroll } from './use-sticky-scroll';

interface SessionChatProps {
  sessionId: string;
  directory: string;
  harnessId?: string;
}

export function SessionChat({
  sessionId,
  directory,
  harnessId,
}: SessionChatProps) {
  const [store] = useState(() => createSessionChatStore());
  const params = { sessionId, directory, harnessId };

  useSessionMessagesQuery(params, store);
  useSessionStatusQuery(params, store);
  useSessionStream(params, store);

  const order = store((s) => s.order);
  const messages = store((s) => s.messages);
  const status = store((s) => s.status);
  const lastUserMessageAt = store((s) => s.lastUserMessageAt);

  const orderedMessages = useMemo(
    () => order.map((id) => messages[id]).filter(Boolean),
    [order, messages],
  );

  const { containerRef } = useStickyScroll<HTMLDivElement>([orderedMessages]);

  const sendMessage = useSendMessage(params);
  const abortSession = useAbortSession(params);

  const [draft, setDraft] = useState('');
  const isBusy = status.type !== 'idle';

  const handleSend = () => {
    const text = draft.trim();
    if (!text || isBusy) return;
    setDraft('');
    sendMessage.mutate({
      parts: [{ type: 'text', text }],
      model: {
        modelId: 'nemotron-3-ultra-free',
        providerId: 'opencode',
      },
    });
  };

  const handlePrimaryAction = () =>
    isBusy ? abortSession.mutate() : handleSend();

  return (
    <div className='flex h-[calc(100svh-56px)] flex-col'>
      <div
        ref={containerRef}
        className='flex-1 scrollbar-thin overflow-y-auto px-4 py-4'
      >
        <MessageList
          messages={orderedMessages}
          status={status}
          lastUserMessageAt={lastUserMessageAt}
        />
      </div>

      <div className='border-divider bg-background border-t p-3'>
        <div className='flex items-end gap-2'>
          <textarea
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            disabled={isBusy}
            placeholder={isBusy ? 'Waiting for response…' : 'Message…'}
            rows={1}
            className='border-divider bg-content1 max-h-40 min-h-10 flex-1 resize-none rounded-lg border px-3 py-2 text-sm outline-none disabled:opacity-60'
          />

          <button
            type='button'
            onClick={handlePrimaryAction}
            disabled={!isBusy && draft.trim().length === 0}
            className='bg-primary text-primary-foreground flex h-10 w-10 shrink-0 items-center justify-center rounded-full disabled:opacity-40'
            aria-label={isBusy ? 'Stop' : 'Send'}
          >
            {isBusy ? (
              <Square className='h-4 w-4' />
            ) : (
              <ArrowUp className='h-5 w-5' />
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
