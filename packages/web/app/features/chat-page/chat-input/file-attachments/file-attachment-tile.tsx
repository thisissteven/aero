import { cn } from '@aero/ui';
import { ExternalFileAttachment } from '@/app/features/chat-page/chat-input/external-parts-store';
import styles from './file-attachment-tile.module.css';

interface FileAttachmentTileProps {
  attachment: ExternalFileAttachment;
  /** Omit for read-only rendering (e.g. sent messages). */
  onRemove?: (id: string) => void;
  onPreview: (attachment: ExternalFileAttachment) => void;
  /**
   * `pending` plays the upload animation (composer).
   * `sent` renders the settled end-state immediately (historical messages).
   */
  variant?: 'pending' | 'sent';
}

export function FileAttachmentTile({
  attachment,
  onRemove,
  onPreview,
  variant = 'pending',
}: FileAttachmentTileProps) {
  const isVideo = attachment.mime.startsWith('video/');
  const isSent = variant === 'sent';

  return (
    <div
      className={cn(styles.wrapper, isSent && styles.sent)}
      onClick={() => onPreview(attachment)}
      role='button'
      tabIndex={0}
      aria-label={`Preview ${attachment.filename}`}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onPreview(attachment);
        }
      }}
    >
      <div className={styles.imageWrapper}>
        {isVideo ? (
          <video
            src={attachment.url}
            className={styles.image}
            muted
            loop
            playsInline
            autoPlay={!isSent}
            preload={isSent ? 'metadata' : 'auto'}
          />
        ) : (
          <img
            src={attachment.url}
            alt={attachment.filename}
            className={styles.image}
            draggable={false}
          />
        )}

        <div className={styles.shimmerOverlay} />
        <svg className={styles.checkSvg} viewBox='0 0 40 40'>
          <polyline
            className={styles.checkMark}
            points='10 20 16 26 30 12'
            pathLength={100}
          />
        </svg>
      </div>

      <div className={styles.borderFrosted} />
      <div className={styles.borderRotating} />

      {onRemove && (
        <button
          type='button'
          className={styles.removeButton}
          onClick={(event) => {
            event.stopPropagation();
            onRemove(attachment.id);
          }}
          aria-label={`Remove ${attachment.filename}`}
        >
          <svg
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth={2}
            strokeLinecap='round'
            width={10}
            height={10}
          >
            <line x1='18' y1='6' x2='6' y2='18' />
            <line x1='6' y1='6' x2='18' y2='18' />
          </svg>
        </button>
      )}
    </div>
  );
}
