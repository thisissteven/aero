'use client';

import { Modal } from '@aero/ui';
import { useEffect, useState } from 'react';

import { MessageComposer } from '@/app/components/chat-aside/notes/message-composer';
import type { ComposerSegment } from '@/app/components/smart-composer/smart-composer-helpers';
import { useI18n } from '@/app/hooks/i18n';
import type { AeroProjectQueueMessage } from '@/server/services/harness/types';

/**
 * Compose/edit surface for a queued message. `message` null means the composer
 * starts empty and adds a new message.
 */
export function MessageEditorDialog({
  message,
  open,
  workspaceDirectory,
  onOpenChange,
  onSubmit,
}: {
  message: AeroProjectQueueMessage | null;
  open: boolean;
  workspaceDirectory: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (segments: ComposerSegment[]) => void;
}) {
  const { t } = useI18n();
  const [nonce, setNonce] = useState(0);

  // Remount the composer each time the dialog opens so it always starts from
  // the current message (or empty) instead of a stale store entry.
  useEffect(() => {
    if (open) setNonce((value) => value + 1);
  }, [open]);

  return (
    <Modal isOpen={open} onOpenChange={onOpenChange}>
      <Modal.Backdrop>
        <Modal.Container>
          <Modal.Dialog>
            {({ close }) => (
              <>
                <Modal.Header>
                  {message
                    ? t.notesPanel.queue.editTitle
                    : t.notesPanel.queue.add}
                </Modal.Header>
                <Modal.Body>
                  <MessageComposer
                    key={nonce}
                    defaultValue={message ? message.segments : []}
                    directory={workspaceDirectory}
                    placeholder={t.notesPanel.queue.addPlaceholder}
                    submitLabel={
                      message ? t.notesPanel.queue.save : t.notesPanel.queue.add
                    }
                    onSubmit={(segments) => {
                      onSubmit(segments);
                      close();
                    }}
                    onCancel={close}
                  />
                </Modal.Body>
              </>
            )}
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
    </Modal>
  );
}
