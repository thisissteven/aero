import { cn } from '@aero/ui';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { MiddleTruncatePath } from '@/app/components/tool-call-view/middle-truncate-path';
import { ExternalFileAttachment } from '@/app/features/chat-page/chat-input/external-parts-store';

interface FileAttachmentRowProps {
  attachment: ExternalFileAttachment;
  onRemove: (id: string) => void;
}

export function FileAttachmentRow({
  attachment,
  onRemove,
}: FileAttachmentRowProps) {
  return (
    <div
      className={cn(
        'relative group/row flex items-center gap-1.5 rounded-lg',
        'border border-border bg-surface-secondary',
        'px-2 py-1 max-w-56',
        'text-xs text-foreground',
      )}
    >
      <FileTypeIcon filePath={attachment.filename} />

      <MiddleTruncatePath
        path={attachment.filename}
        className='min-w-0 flex-1 text-xs'
      />

      <button
        type='button'
        className={cn(
          'absolute top-1/2 -translate-y-1/2 right-1 shrink-0 size-4 grid place-items-center',
          'opacity-0 group-hover/row:opacity-100 transition-opacity',
          'text-muted bg-surface-secondary rounded border border-separator',
        )}
        onClick={() => onRemove(attachment.id)}
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
    </div>
  );
}
