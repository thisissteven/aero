import { cn } from '@aero/ui';
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

interface FileAttachmentsViewProps {
  attachments: ExternalFileAttachment[];
  /** Omit for read-only rendering (e.g. sent messages). */
  onRemove?: (id: string) => void;
  className?: string;
  /** `pending` (default) plays the upload animation; `sent` skips it. */
  variant?: 'pending' | 'sent';
}

/**
 * Pure presentational view. Works with any list of attachments, whether they
 * come from the composer store or from a persisted message's parts.
 */
export function FileAttachmentsView({
  attachments,
  onRemove,
  className,
  variant = 'pending',
}: FileAttachmentsViewProps) {
  const [previewId, setPreviewId] = useState<string | null>(null);

  const { media, files } = useMemo(() => {
    const media: ExternalFileAttachment[] = [];
    const files: ExternalFileAttachment[] = [];

    for (const attachment of attachments) {
      (isMediaAttachment(attachment) ? media : files).push(attachment);
    }

    return { media, files };
  }, [attachments]);

  // Resolve index at render time. If the previewed item was removed,
  // findIndex returns -1 and the lightbox closes on its own.
  const previewIndex = previewId
    ? media.findIndex((a) => a.id === previewId)
    : -1;

  const handleNavigate = useCallback(
    (nextIndex: number) => {
      setPreviewId(media[nextIndex]?.id ?? null);
    },
    [media],
  );

  if (attachments.length === 0) return null;

  return (
    <>
      <div className={cn('flex flex-col gap-2 px-2', className)}>
        {media.length > 0 && (
          <div
            className={cn(
              'flex flex-wrap gap-1.5',
              variant === 'sent' && 'justify-end',
            )}
          >
            {media.map((attachment) => (
              <FileAttachmentTile
                key={attachment.id}
                attachment={attachment}
                onRemove={onRemove}
                onPreview={(a) => setPreviewId(a.id)}
                variant={variant}
              />
            ))}
          </div>
        )}

        {files.length > 0 && (
          <div
            className={cn(
              'flex flex-wrap gap-1.5',
              variant === 'sent' && 'justify-end',
            )}
          >
            {files.map((attachment) => (
              <FileAttachmentRow
                key={attachment.id}
                attachment={attachment}
                onRemove={onRemove}
              />
            ))}
          </div>
        )}
      </div>

      <FileAttachmentLightbox
        attachments={media}
        index={previewIndex >= 0 ? previewIndex : null}
        onIndexChange={handleNavigate}
        onClose={() => setPreviewId(null)}
      />
    </>
  );
}

/** Store-connected composer version — unchanged public API. */
export function FileAttachments() {
  const sessionId = useSessionId();

  const attachments = useExternalPartsStore(
    (state) => getExternalPartsSession(state, sessionId).fileAttachments,
  );
  const removeFileAttachment = useExternalPartsStore(
    (state) => state.removeFileAttachment,
  );

  const handleRemove = useCallback(
    (id: string) => {
      removeFileAttachment(sessionId, id);
    },
    [removeFileAttachment, sessionId],
  );

  const isChatInputExpanded = useChatInputExpanded();

  if (attachments.length === 0 || isChatInputExpanded) return null;

  return (
    <FileAttachmentsView
      attachments={attachments}
      onRemove={handleRemove}
      className={sessionId ? 'pb-2' : 'pb-1'}
    />
  );
}
