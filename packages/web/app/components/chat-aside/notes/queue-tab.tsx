'use client';

import { Button } from '@aero/ui';
import { Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import { ComposerContent } from '@/app/components/chat-aside/notes/composer-content';
import { composerTextFromSegments } from '@/app/components/chat-aside/notes/composer-segments';
import { MessageActionsMenu } from '@/app/components/chat-aside/notes/message-actions-menu';
import { MessageEditorDialog } from '@/app/components/chat-aside/notes/message-editor-dialog';
import { useSendQueuedMessage } from '@/app/components/chat-aside/notes/send-queued-message';
import type { SendTodoTarget } from '@/app/components/chat-aside/notes/send-todo';
import type { ComposerSegment } from '@/app/components/smart-composer/smart-composer-helpers';
import { useSaveProjectQueue } from '@/app/hooks/api/project-context';
import { useI18n } from '@/app/hooks/i18n';
import { useOptionalSessionId } from '@/app/providers/SessionIdProvider';
import type { AeroProjectQueueMessage } from '@/server/services/harness/types';

/**
 * Message queue: compose messages with the smart composer and hold them until
 * they are dispatched to an agent session.
 */
export function QueueTab({
  workspaceId,
  workspaceDirectory,
  queue,
}: {
  workspaceId: string;
  workspaceDirectory: string;
  queue: AeroProjectQueueMessage[];
}) {
  const { t } = useI18n();
  const sessionId = useOptionalSessionId();
  const sendQueuedMessage = useSendQueuedMessage();
  const save = useSaveProjectQueue(workspaceId);

  const [editor, setEditor] = useState<{
    message: AeroProjectQueueMessage | null;
  } | null>(null);

  const canSendToCurrent = Boolean(sessionId);

  const update = (next: AeroProjectQueueMessage[]) => save.mutate(next);

  const handleSend = (
    target: SendTodoTarget,
    message: AeroProjectQueueMessage,
  ) =>
    sendQueuedMessage({
      segments: message.segments,
      text: message.text,
      target,
      sessionId,
      workspaceDirectory,
    });

  const submitEditor = (segments: ComposerSegment[]) => {
    if (!editor) return;
    const text = composerTextFromSegments(segments);
    if (editor.message) {
      update(
        queue.map((message) =>
          message.id === editor.message?.id
            ? { ...message, text, segments }
            : message,
        ),
      );
      return;
    }
    update([
      {
        id: crypto.randomUUID(),
        text,
        segments,
        createdAt: Date.now(),
      },
      ...queue,
    ]);
  };

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-separator flex shrink-0 items-center justify-end border-b px-3 py-2'>
        <Button
          size='sm'
          variant='ghost'
          className='h-7 rounded-lg text-xs'
          onPress={() => setEditor({ message: null })}
        >
          <Icon data={Plus} />
          {t.notesPanel.queue.add}
        </Button>
      </div>

      <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1.5'>
        {queue.length === 0 ? (
          <div className='text-muted flex h-full items-center justify-center px-4 text-center text-sm'>
            {t.notesPanel.queue.empty}
          </div>
        ) : (
          queue.map((message) => (
            <div
              key={message.id}
              className='group hover:bg-surface-hover flex items-start gap-2 rounded-lg p-2 transition-colors'
            >
              <div className='text-foreground min-w-0 flex-1 text-sm'>
                <ComposerContent segments={message.segments} />
              </div>
              <MessageActionsMenu
                canSendToCurrent={canSendToCurrent}
                triggerClassName='opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
                onEdit={() => setEditor({ message })}
                onSend={(target) => handleSend(target, message)}
                onDelete={() =>
                  update(queue.filter((entry) => entry.id !== message.id))
                }
              />
            </div>
          ))
        )}
      </div>

      <MessageEditorDialog
        message={editor?.message ?? null}
        open={Boolean(editor)}
        workspaceDirectory={workspaceDirectory}
        onOpenChange={(open) => {
          if (!open) setEditor(null);
        }}
        onSubmit={submitEditor}
      />
    </div>
  );
}
