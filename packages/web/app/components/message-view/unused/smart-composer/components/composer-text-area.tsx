import React, { useEffect } from 'react';

import { cn } from '@aero/ui';

import { SMART_COMPOSER_PLACEHOLDER } from '@/app/components/message-view/unused/smart-composer/components/composer-placeholder';

import { findTokenImmediatelyBeforeCaret } from '../smart-composer-dom';
import { buildText, SearchItem } from '../smart-composer-helpers';
import { useComposerStore } from '../smart-composer-store';

interface ComposerTextareaProps {
  editorRef: React.RefObject<HTMLDivElement | null>;

  paletteOpen: boolean;
  selectedItem: SearchItem;

  onInput: () => void;
  onCopy: (event: React.ClipboardEvent<HTMLDivElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLDivElement>) => void;
  onSubmit: () => void;

  onUndo: () => void;
  onRedo: () => void;

  onShellEnter: () => void;
  onShellExit: () => void;

  onPaletteSelect: (item: SearchItem) => void;

  onPaletteClose: () => void;
  onPaletteMove: (direction: 1 | -1) => void;
}

export function ComposerTextarea({
  editorRef,
  paletteOpen,
  selectedItem,
  onInput,
  onCopy,
  onPaste,
  onSubmit,
  onUndo,
  onRedo,
  onShellEnter,
  onShellExit,
  onPaletteSelect,
  onPaletteClose,
  onPaletteMove,
}: ComposerTextareaProps) {
  const mode = useComposerStore((state) => state.mode);

  const getText = () => buildText(useComposerStore.getState().segments);

  const handleKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
    const isMod = event.ctrlKey || event.metaKey;

    const key = event.key.toLowerCase();

    if (isMod && key === 'z' && !event.shiftKey) {
      event.preventDefault();
      onUndo();
      return;
    }

    if ((isMod && key === 'y') || (isMod && event.shiftKey && key === 'z')) {
      event.preventDefault();
      onRedo();
      return;
    }

    if (mode === 'shell' && event.key === 'Escape') {
      event.preventDefault();
      onShellExit();
      return;
    }

    if (
      mode === 'shell' &&
      event.key === 'Backspace' &&
      getText().length === 0
    ) {
      event.preventDefault();
      onShellExit();
      return;
    }

    if (mode === 'shell') {
      if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        onSubmit();
      }

      return;
    }

    if (
      event.key === '!' &&
      !event.altKey &&
      !event.ctrlKey &&
      !event.metaKey
    ) {
      if (getText().trim() === '') {
        event.preventDefault();
        onShellEnter();
        return;
      }
    }

    if (paletteOpen) {
      if (event.key === 'ArrowDown') {
        event.preventDefault();
        onPaletteMove(1);
        return;
      }

      if (event.key === 'ArrowUp') {
        event.preventDefault();
        onPaletteMove(-1);
        return;
      }

      if ((event.key === 'Enter' || event.key === 'Tab') && selectedItem) {
        event.preventDefault();
        onPaletteSelect(selectedItem);
        return;
      }

      if (event.key === 'Escape') {
        event.preventDefault();
        onPaletteClose();
        return;
      }
    }

    if (event.key === 'Backspace') {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      const token = findTokenImmediatelyBeforeCaret(editor);

      if (token) {
        event.preventDefault();

        const { trigger = '@', value = '' } = token.dataset;

        const textNode = document.createTextNode(`${trigger}${value}`);

        token.parentNode?.replaceChild(textNode, token);

        const range = document.createRange();

        range.setStart(textNode, textNode.textContent?.length || 0);

        range.collapse(true);

        const selection = window.getSelection();

        selection?.removeAllRanges();
        selection?.addRange(range);

        onInput();
        return;
      }
    }

    if (event.key === 'Enter' && !event.shiftKey && !paletteOpen) {
      event.preventDefault();
      onSubmit();
    }
  };

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    editorRef.current.spellcheck = false;
  }, [editorRef]);

  return (
    <div className='relative'>
      <div
        ref={editorRef}
        className={cn(
          'max-h-[min(60vh,520px)] min-h-[140px]',
          'overflow-wrap-anywhere overflow-y-auto whitespace-pre-wrap',
          'border-border rounded-[var(--radius)] border',
          'bg-surface px-[1.1rem] py-4',
          'font-sans text-[15px] leading-[1.6]',
          'tracking-[-0.011em]',
          'caret-accent outline-none',
          'shadow-[var(--surface-shadow)]',
          mode === 'shell' &&
            'border-accent/50 font-mono text-base tracking-[-0.013em] shadow-[var(--overlay-shadow)]',
        )}
        contentEditable
        role='textbox'
        aria-multiline='true'
        data-placeholder={SMART_COMPOSER_PLACEHOLDER}
        onKeyDown={handleKeyDown}
        onInput={onInput}
        onCopy={onCopy}
        onPaste={onPaste}
      />
    </div>
  );
}
