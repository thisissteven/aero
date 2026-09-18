import { cn } from '@aero/ui';
import { useEffect } from 'react';
import { ExternalFileAttachment } from '@/app/features/chat-page/chat-input/external-parts-store';

interface FileAttachmentLightboxProps {
  attachment: ExternalFileAttachment | null;
  onClose: () => void;
}

export function FileAttachmentLightbox({
  attachment,
  onClose,
}: FileAttachmentLightboxProps) {
  useEffect(() => {
    if (!attachment) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };

    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [attachment, onClose]);

  if (!attachment) return null;

  const isVideo = attachment.mime.startsWith('video/');

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 grid place-items-center p-8',
        'bg-[var(--backdrop)] backdrop-blur-sm',
      )}
      onClick={onClose}
      role='dialog'
      aria-modal='true'
      aria-label={`Preview ${attachment.filename}`}
    >
      <div
        className={cn(
          'relative max-w-[90vw] max-h-[90vh] rounded-xl overflow-hidden',
          'bg-[var(--overlay)] text-[var(--overlay-foreground)]',
          'shadow-[var(--overlay-shadow)]',
        )}
        onClick={(event) => event.stopPropagation()}
      >
        {isVideo ? (
          <video
            src={attachment.url}
            className='max-w-[90vw] max-h-[90vh] block'
            controls
            autoPlay
            loop
          />
        ) : (
          <img
            src={attachment.url}
            alt={attachment.filename}
            className='max-w-[90vw] max-h-[90vh] block object-contain'
            draggable={false}
          />
        )}

        <div
          className={cn(
            'absolute bottom-0 inset-x-0 px-3 py-2',
            'bg-gradient-to-t from-[var(--backdrop)] to-transparent',
            'text-xs text-[var(--overlay-foreground)] truncate',
          )}
        >
          {attachment.filename}
        </div>
      </div>
    </div>
  );
}
