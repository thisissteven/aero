'use client';

import { Button, cn } from '@aero/ui';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ComposerCommandPalette } from '@/app/components/smart-composer/components/composer-cp';
import { replaceEditorContent } from '@/app/components/smart-composer/smart-composer-dom';
import type {
  ComposerSegment,
  SearchItem,
} from '@/app/components/smart-composer/smart-composer-helpers';
import { useComposerStore } from '@/app/components/smart-composer/smart-composer-store';
import { useComposerPalette } from '@/app/components/smart-composer/use-composer-palette';
import { useSmartComposer } from '@/app/components/smart-composer/use-smart-composer';
import { useI18n } from '@/app/hooks/i18n';

/**
 * A message-sized instance of the smart composer: same `@` mentions, `/`
 * commands and skills, and `#` snippets, but backed by its own store key and
 * scoped to the workspace directory instead of a chat session.
 */
export function MessageComposer({
  defaultValue,
  directory,
  placeholder,
  submitLabel,
  autoFocus = true,
  onSubmit,
  onCancel,
}: {
  defaultValue?: ComposerSegment[];
  directory?: string;
  placeholder: string;
  submitLabel: string;
  autoFocus?: boolean;
  onSubmit: (segments: ComposerSegment[]) => void;
  onCancel?: () => void;
}) {
  const { t } = useI18n();
  const editorRef = useRef<HTMLDivElement | null>(null);
  const composerKey = useMemo(
    () => `message-composer:${crypto.randomUUID()}`,
    [],
  );
  // Render the palette inside the enclosing modal dialog so it stacks above
  // the dialog content and stays within its focus/dismiss scope.
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);

  const composer = useSmartComposer({ editorRef, composerKey });
  const palette = useComposerPalette({ editorRef, composerKey, directory });

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) return;

    setPortalTarget(
      editor.closest<HTMLElement>('[data-slot="modal-dialog"]') ??
        document.body,
    );

    replaceEditorContent(editor, defaultValue ?? []);
    composer.initialize();

    if (autoFocus) {
      const range = document.createRange();
      range.selectNodeContents(editor);
      range.collapse(false);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      editor.focus();
    }

    return () => {
      useComposerStore.getState().reset(composerKey);
    };
    // Runs once per mounted composer; the key namespaces its store entry.
  }, []);

  const submit = useCallback(() => {
    const segments = composer.syncFromDom() ?? [];
    const hasContent = segments.some(
      (segment) =>
        segment.type === 'token' ||
        (segment.type === 'text' && segment.text.trim().length > 0),
    );
    if (hasContent) onSubmit(segments);
  }, [composer, onSubmit]);

  const handleSelect = useCallback(
    (item: SearchItem) => {
      if (!palette.activeTrigger) return;
      composer.insertToken(item, palette.activeTrigger.editableOffset);
      palette.close();
    },
    [composer, palette],
  );

  return (
    <div className='relative'>
      <div className='border-separator bg-default/40 focus-within:border-accent flex flex-col overflow-hidden rounded-lg border transition-colors'>
        <div
          ref={editorRef}
          contentEditable
          role='textbox'
          aria-multiline='true'
          data-placeholder={placeholder}
          onInput={() => composer.commitFromDom()}
          onKeyDown={(event) => {
            if (palette.composerOpen) {
              if (event.key === 'ArrowDown') {
                event.preventDefault();
                palette.moveSelection(1);
                return;
              }
              if (event.key === 'ArrowUp') {
                event.preventDefault();
                palette.moveSelection(-1);
                return;
              }
              if (
                (event.key === 'Enter' || event.key === 'Tab') &&
                palette.selectedItem
              ) {
                event.preventDefault();
                event.stopPropagation();
                handleSelect(palette.selectedItem);
                return;
              }
              if (event.key === 'Escape') {
                event.preventDefault();
                palette.close();
                return;
              }
            }

            if (event.key === 'Escape') {
              event.preventDefault();
              onCancel?.();
              return;
            }

            if (event.key === 'Enter' && !event.shiftKey) {
              event.preventDefault();
              submit();
            }
          }}
          className={cn(
            'message-composer__editor min-h-8 overflow-wrap-anywhere px-2 py-1.5 text-sm whitespace-pre-wrap outline-none',
            '[&_.token]:bg-default [&_.token]:rounded-md [&_.token]:px-1 [&_.token]:py-px',
            'empty:before:text-muted empty:before:pointer-events-none empty:before:content-[attr(data-placeholder)]',
          )}
        />

        <div className='flex items-center justify-between gap-2 px-1.5 pb-1.5'>
          <span className='text-muted min-w-0 truncate text-[11px]'>
            {t.composer.placeholderHint}
          </span>
          <div className='flex shrink-0 items-center gap-1'>
            {onCancel ? (
              <Button
                size='sm'
                variant='ghost'
                className='h-7 rounded-lg text-xs'
                onPress={onCancel}
              >
                {t.common.cancel}
              </Button>
            ) : null}
            <Button
              size='sm'
              variant='primary'
              className='h-7 rounded-lg text-xs'
              onPress={submit}
            >
              {submitLabel}
            </Button>
          </div>
        </div>
      </div>

      <ComposerCommandPalette
        open={palette.composerOpen}
        results={palette.results}
        selectedIndex={palette.selectedIndex}
        caretRect={palette.caretRect}
        onSelect={handleSelect}
        close={palette.close}
        onHover={palette.setHoverIndex}
        onHoverReset={palette.clearHoverSuppression}
        scrollIndex={palette.scrollIndex}
        portalTarget={portalTarget}
      />
    </div>
  );
}
