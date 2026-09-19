import { cn } from '@aero/ui';
import { Xmark } from '@gravity-ui/icons';
import { useEffect, useId, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { CodeBlock } from '@/app/components/code-block/code-block';
import { CodeBlockContent } from '@/app/components/code-block/code-block-content';
import { FileTypeIcon } from '@/app/components/file-type-icon';
import { ExternalFileAttachment } from '@/app/features/chat-page/chat-input/external-parts-store';
import { getFileExtension } from '@/app/lib/file';
import { getLanguageFromExtension } from '@/app/lib/file-icons/tool-helpers';

/** Must match the panel's `duration-200` below. */
const TRANSITION_MS = 200;

/** Cap what we pull off the wire so huge files don't land in memory. */
const MAX_PREVIEW_BYTES = 512 * 1024; // 512 KB
/** Cap what we render so the DOM doesn't blow up. */
const MAX_PREVIEW_LINES = 500;

type PreviewKind = 'image' | 'video' | 'audio' | 'pdf' | 'text' | 'unsupported';

const TEXT_EXTENSIONS =
  /\.(md|markdown|mdx|txt|json|jsonc|ya?ml|toml|csv|tsv|log|ini|env|sh|bash|zsh|tsx?|jsx?|mjs|cjs|py|rb|go|rs|java|kt|c|h|cpp|hpp|cs|php|swift|sql|css|scss|html?|xml|svg)$/i;

function getPreviewKind(mime: string, filename: string): PreviewKind {
  const normalized = mime.toLowerCase();

  if (normalized.startsWith('image/')) return 'image';
  if (normalized.startsWith('video/')) return 'video';
  if (normalized.startsWith('audio/')) return 'audio';
  if (normalized === 'application/pdf') return 'pdf';
  if (normalized.startsWith('text/')) return 'text';
  if (TEXT_EXTENSIONS.test(filename)) return 'text';

  return 'unsupported';
}

/**
 * The store type doesn't commit to a URL field, so read it defensively —
 * adjust this if `ExternalFileAttachment` grows a typed `url`.
 */
function getAttachmentUrl(attachment: ExternalFileAttachment): string | null {
  const candidate = (attachment as { url?: unknown }).url;
  return typeof candidate === 'string' && candidate.length > 0
    ? candidate
    : null;
}

/**
 * Reads a text response, stopping once `maxBytes` have been consumed.
 * Returns what was read plus whether we cut it short.
 */
async function readTextUpTo(
  src: string,
  maxBytes: number,
  signal: AbortSignal,
): Promise<{ text: string; truncated: boolean }> {
  const response = await fetch(src, { signal });
  if (!response.ok) throw new Error(`Request failed (${response.status})`);

  // No streaming body (older browsers, tests) — fall back to a plain read.
  if (!response.body) {
    const text = await response.text();
    if (text.length <= maxBytes) return { text, truncated: false };
    return { text: text.slice(0, maxBytes), truncated: true };
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let received = 0;
  let text = '';
  let truncated = false;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;

    received += value.byteLength;

    if (received > maxBytes) {
      const overshoot = received - maxBytes;
      const keep = value.byteLength - overshoot;
      text += decoder.decode(value.subarray(0, keep), { stream: true });
      truncated = true;
      await reader.cancel();
      break;
    }

    text += decoder.decode(value, { stream: true });
  }

  text += decoder.decode(); // flush any pending bytes
  return { text, truncated };
}

/** Keeps the first `maxLines` lines, reporting whether anything was dropped. */
function capLines(
  text: string,
  maxLines: number,
): { text: string; truncated: boolean } {
  const lines = text.split('\n');
  if (lines.length <= maxLines) return { text, truncated: false };
  return { text: lines.slice(0, maxLines).join('\n'), truncated: true };
}

/**
 * Keeps a closing element in the tree long enough to play its exit transition.
 */
function useMountTransition(isOpen: boolean, durationMs: number) {
  const [isMounted, setIsMounted] = useState(isOpen);
  const [isEntered, setIsEntered] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setIsMounted(true);

      // Two frames: one to paint the "closed" state, one to start the transition.
      let inner = 0;
      const outer = requestAnimationFrame(() => {
        inner = requestAnimationFrame(() => setIsEntered(true));
      });

      return () => {
        cancelAnimationFrame(outer);
        cancelAnimationFrame(inner);
      };
    }

    setIsEntered(false);
    const timeout = window.setTimeout(() => setIsMounted(false), durationMs);
    return () => window.clearTimeout(timeout);
  }, [isOpen, durationMs]);

  return { isMounted, isEntered };
}

interface FileContentsSheetProps {
  /** `null` closes the sheet. */
  attachment: ExternalFileAttachment | null;
  onClose: () => void;
}

export function FileContentsSheet({
  attachment,
  onClose,
}: FileContentsSheetProps) {
  const isOpen = attachment !== null;
  const { isMounted, isEntered } = useMountTransition(isOpen, TRANSITION_MS);
  const panelRef = useRef<HTMLDivElement>(null);
  const titleId = useId();

  // Hold the last attachment so the panel keeps its content while sliding out.
  const [lastAttachment, setLastAttachment] =
    useState<ExternalFileAttachment | null>(null);

  useEffect(() => {
    if (attachment) setLastAttachment(attachment);
  }, [attachment]);

  const activeAttachment = attachment ?? lastAttachment;

  // Resolve the portal target after mount so this stays SSR-safe.
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    setPortalRoot(document.body);
  }, []);

  // Escape dismisses.
  useEffect(() => {
    if (!isMounted) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.stopPropagation();
      onClose();
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isMounted, onClose]);

  // Lock background scroll, compensating for the scrollbar so nothing shifts.
  useEffect(() => {
    if (!isOpen) return;

    const { overflow, paddingRight } = document.body.style;
    const scrollbarWidth =
      window.innerWidth - document.documentElement.clientWidth;

    document.body.style.overflow = 'hidden';
    if (scrollbarWidth > 0) {
      document.body.style.paddingRight = `${scrollbarWidth}px`;
    }

    return () => {
      document.body.style.overflow = overflow;
      document.body.style.paddingRight = paddingRight;
    };
  }, [isOpen]);

  // Move focus into the panel, then hand it back on close.
  useEffect(() => {
    if (!isMounted) return;

    const previouslyFocused = document.activeElement as HTMLElement | null;
    panelRef.current?.focus({ preventScroll: true });

    return () => previouslyFocused?.focus?.({ preventScroll: true });
  }, [isMounted]);

  if (!portalRoot || !isMounted || !activeAttachment) return null;

  return createPortal(
    <div
      className={cn('fixed inset-0 z-50', !isEntered && 'pointer-events-none')}
    >
      <div
        aria-hidden='true'
        onClick={onClose}
        className={cn(
          'absolute inset-0 bg-black/40 transition-opacity duration-200 ease-out',
          isEntered ? 'opacity-100' : 'opacity-0',
        )}
      />

      <div
        ref={panelRef}
        role='dialog'
        aria-modal='true'
        aria-labelledby={titleId}
        tabIndex={-1}
        className={cn(
          'absolute inset-y-0 right-0 flex w-full flex-col',
          'bg-surface border-l border-border shadow-2xl outline-none',
          'transition-transform duration-200 ease-out will-change-transform',
          'sm:max-w-md md:max-w-lg',
          isEntered ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        <header className='flex shrink-0 items-center gap-2 border-b border-border pl-4 pr-3 py-3'>
          <FileTypeIcon filePath={activeAttachment.filename} />

          <h2
            id={titleId}
            title={activeAttachment.filename}
            className='min-w-0 flex-1 truncate text-sm font-medium text-foreground'
          >
            {activeAttachment.filename}
          </h2>

          <button
            type='button'
            onClick={onClose}
            aria-label='Close file preview'
            className={cn(
              'shrink-0 grid size-7 place-items-center rounded-md',
              'text-muted transition-colors hover:bg-surface-secondary hover:text-foreground',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-border',
            )}
          >
            <Xmark />
          </button>
        </header>

        <div className='min-h-0 flex-1 overflow-auto'>
          <SheetBody attachment={activeAttachment} />
        </div>
      </div>
    </div>,
    portalRoot,
  );
}

function SheetBody({ attachment }: { attachment: ExternalFileAttachment }) {
  const src = getAttachmentUrl(attachment);
  const kind = getPreviewKind(attachment.mime, attachment.filename);

  const [textState, setTextState] = useState<
    | { status: 'loading' }
    | { status: 'ready'; text: string; truncated: boolean }
    | { status: 'error'; message: string }
  >({ status: 'loading' });

  useEffect(() => {
    if (kind !== 'text' || !src) return;

    const controller = new AbortController();
    setTextState({ status: 'loading' });

    (async () => {
      try {
        const raw = await readTextUpTo(
          src,
          MAX_PREVIEW_BYTES,
          controller.signal,
        );
        const capped = capLines(raw.text, MAX_PREVIEW_LINES);

        if (controller.signal.aborted) return;

        setTextState({
          status: 'ready',
          text: capped.text,
          truncated: raw.truncated || capped.truncated,
        });
      } catch (error: unknown) {
        if (controller.signal.aborted) return;
        setTextState({
          status: 'error',
          message:
            error instanceof Error
              ? error.message
              : 'Could not load this file.',
        });
      }
    })();

    return () => controller.abort();
  }, [kind, src]);

  if (!src) {
    return (
      <SheetMessage
        title='Preview unavailable'
        description='This attachment doesn’t have a file to load.'
      />
    );
  }

  switch (kind) {
    case 'image':
      return (
        <div className='grid min-h-full place-items-center p-4'>
          <img
            src={src}
            alt={attachment.filename}
            className='max-h-full max-w-full rounded-md object-contain'
          />
        </div>
      );

    case 'video':
      return (
        <div className='grid min-h-full place-items-center p-4'>
          <video src={src} controls className='max-h-full w-full rounded-md' />
        </div>
      );

    case 'audio':
      return (
        <div className='grid min-h-full place-items-center p-4'>
          <audio src={src} controls className='w-full' />
        </div>
      );

    case 'pdf':
      return (
        <iframe
          src={src}
          title={attachment.filename}
          className='h-full w-full border-0'
        />
      );

    case 'text':
      if (textState.status === 'loading') {
        return <SheetMessage title='Loading…' />;
      }

      if (textState.status === 'error') {
        return (
          <SheetMessage
            title='Could not load this file'
            description={textState.message}
          />
        );
      }

      return (
        <div className='flex h-full flex-col'>
          <div className='min-h-0 flex-1'>
            <CodeBlock className='border-0 h-full'>
              <CodeBlockContent
                code={textState.text}
                language={getFileExtension(attachment.filename)}
                style={{ maxHeight: '100%' }}
                className='p-2'
              />
            </CodeBlock>
          </div>

          {textState.truncated && (
            <div className='flex shrink-0 items-center justify-between gap-3 border-t border-border bg-surface-secondary px-4 py-2 text-xs text-muted'>
              <span>
                Preview truncated at {MAX_PREVIEW_LINES.toLocaleString()} lines.
              </span>
              <a
                href={src}
                download={attachment.filename}
                className='shrink-0 rounded text-foreground underline underline-offset-2 hover:no-underline'
              >
                Download
              </a>
            </div>
          )}
        </div>
      );

    default:
      return (
        <SheetMessage
          title='No preview available'
          description={`${attachment.mime || 'This file type'} can’t be previewed here.`}
        />
      );
  }
}

function SheetMessage({
  title,
  description,
}: {
  title: string;
  description?: string;
}) {
  return (
    <div className='grid min-h-full place-items-center p-8 text-center'>
      <div className='max-w-xs space-y-1'>
        <p className='text-sm font-medium text-foreground'>{title}</p>
        {description && <p className='text-xs text-muted'>{description}</p>}
      </div>
    </div>
  );
}
