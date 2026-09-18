import { cn } from '@aero/ui';
import { ChevronLeft, ChevronRight, Xmark } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useCallback, useEffect } from 'react';

import { ExternalFileAttachment } from '@/app/features/chat-page/chat-input/external-parts-store';

interface FileAttachmentLightboxProps {
  attachments: ExternalFileAttachment[];
  index: number | null;
  onIndexChange: (index: number) => void;
  onClose: () => void;
}

export function FileAttachmentLightbox({
  attachments,
  index,
  onIndexChange,
  onClose,
}: FileAttachmentLightboxProps) {
  const isOpen = index !== null;
  const count = attachments.length;

  const goPrev = useCallback(() => {
    if (index === null || count === 0) return;
    onIndexChange((index - 1 + count) % count);
  }, [count, index, onIndexChange]);

  const goNext = useCallback(() => {
    if (index === null || count === 0) return;
    onIndexChange((index + 1) % count);
  }, [count, index, onIndexChange]);

  useEffect(() => {
    if (!isOpen) return;

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      else if (event.key === 'ArrowLeft') goPrev();
      else if (event.key === 'ArrowRight') goNext();
    };

    document.addEventListener('keydown', onKeyDown);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen, onClose, goPrev, goNext]);

  if (index === null || count === 0) return null;

  const attachment = attachments[index];
  if (!attachment) return null;

  const isVideo = attachment.mime.startsWith('video/');
  const showNav = count > 1;

  return (
    <div
      className={cn(
        'fixed inset-0 z-50 grid place-items-center p-8',
        'dark:bg-backdrop bg-white/40 backdrop-blur-sm',
      )}
      onClick={onClose}
      role='dialog'
      aria-modal='true'
      aria-label={`Preview ${attachment.filename}`}
    >
      {showNav && (
        <>
          <button
            type='button'
            className={cn(
              'absolute left-4 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full',
              'bg-surface/60 text-foreground backdrop-blur-sm',
              'transition-colors hover:bg-surface/85',
            )}
            onClick={(event) => {
              event.stopPropagation();
              goPrev();
            }}
            aria-label='Previous attachment'
          >
            <Icon data={ChevronLeft} size={16} />
          </button>

          <button
            type='button'
            className={cn(
              'absolute right-4 top-1/2 z-10 grid size-9 -translate-y-1/2 place-items-center rounded-full',
              'bg-surface/60 text-foreground backdrop-blur-sm',
              'transition-colors hover:bg-surface/85',
            )}
            onClick={(event) => {
              event.stopPropagation();
              goNext();
            }}
            aria-label='Next attachment'
          >
            <Icon data={ChevronRight} size={16} />
          </button>
        </>
      )}

      <button
        type='button'
        className={cn(
          'absolute right-4 top-4 z-10 grid size-8 place-items-center rounded-full',
          'bg-surface/60 text-foreground backdrop-blur-sm',
          'transition-colors hover:bg-surface/85',
        )}
        onClick={(event) => {
          event.stopPropagation();
          onClose();
        }}
        aria-label='Close preview'
      >
        <Icon data={Xmark} size={14} />
      </button>

      {showNav && (
        <div
          className={cn(
            'absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-full px-2.5 py-1',
            'bg-surface/60 text-xs text-foreground backdrop-blur-sm',
          )}
        >
          {index + 1} / {count}
        </div>
      )}

      <div
        className='flex max-h-[85vh] max-w-[85vw] flex-col items-center gap-3'
        onClick={(event) => event.stopPropagation()}
      >
        <div
          className={cn(
            'overflow-hidden rounded-xl',
            'bg-overlay text-foreground',
            'shadow-overlay-shadow',
          )}
        >
          {isVideo ? (
            <video
              key={attachment.id}
              src={attachment.url}
              className='block max-h-[78vh] max-w-[85vw]'
              controls
              autoPlay
              loop
            />
          ) : (
            <img
              key={attachment.id}
              src={attachment.url}
              alt={attachment.filename}
              className='pointer-events-none block max-h-[78vh] max-w-[85vw] object-contain'
              draggable={false}
            />
          )}
        </div>

        <span
          className={cn(
            'max-w-[85vw] truncate text-xs',
            'text-[var(--overlay-foreground)] drop-shadow-sm',
          )}
          title={attachment.filename}
        >
          {attachment.filename}
        </span>
      </div>
    </div>
  );
}
