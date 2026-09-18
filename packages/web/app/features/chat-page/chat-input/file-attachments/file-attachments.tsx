import { useCallback, useMemo, useState } from 'react';
import {
  ExternalFileAttachment,
  getExternalPartsSession,
  useExternalPartsStore,
} from '@/app/features/chat-page/chat-input/external-parts-store';
import { FileAttachmentLightbox } from '@/app/features/chat-page/chat-input/file-attachments/file-attachment-lightbox';
import { FileAttachmentRow } from '@/app/features/chat-page/chat-input/file-attachments/file-attachment-row';
import { FileAttachmentTile } from '@/app/features/chat-page/chat-input/file-attachments/file-attachment-tile';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { useSessionId } from '@/app/providers/SessionIdProvider';

function isMediaAttachment(attachment: ExternalFileAttachment): boolean {
  return (
    attachment.mime.startsWith('image/') || attachment.mime.startsWith('video/')
  );
}

export function FileAttachments() {
  const sessionId = useSessionId();

  const attachments = useExternalPartsStore(
    (state) => getExternalPartsSession(state, sessionId).fileAttachments,
  );
  const removeFileAttachment = useExternalPartsStore(
    (state) => state.removeFileAttachment,
  );

  const [preview, setPreview] = useState<ExternalFileAttachment | null>(null);

  const { media, files } = useMemo(() => {
    const media: ExternalFileAttachment[] = [];
    const files: ExternalFileAttachment[] = [];

    for (const attachment of attachments) {
      (isMediaAttachment(attachment) ? media : files).push(attachment);
    }

    return { media, files };
  }, [attachments]);

  const handleRemove = useCallback(
    (id: string) => {
      removeFileAttachment(sessionId, id);
      setPreview((current) => (current?.id === id ? null : current));
    },
    [removeFileAttachment, sessionId],
  );

  const isChatInputExpanded = useChatInputExpanded();

  if (attachments.length === 0 || isChatInputExpanded) return null;

  return (
    <>
      <div className='flex flex-col gap-2 px-2 pb-2'>
        {media.length > 0 && (
          <div className='flex flex-wrap gap-1.5'>
            {media.map((attachment) => (
              <FileAttachmentTile
                key={attachment.id}
                attachment={attachment}
                onRemove={handleRemove}
                onPreview={setPreview}
              />
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div className='flex flex-wrap gap-1.5'>
            {files.map((attachment) => (
              <FileAttachmentRow
                key={attachment.id}
                attachment={attachment}
                onRemove={handleRemove}
              />
            ))}
          </div>
        )}
      </div>

      <FileAttachmentLightbox
        attachment={preview}
        onClose={() => setPreview(null)}
      />
    </>
  );
}
