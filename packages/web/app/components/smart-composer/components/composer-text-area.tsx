import { useLocation, useParams } from '@tanstack/react-router';
import React, { useEffect } from 'react';

import { cn } from '@aero/ui';

import { SMART_COMPOSER_PLACEHOLDER } from '@/app/components/smart-composer/components/composer-placeholder';
import { useChatInputExpanded } from '@/app/hooks/api/config';
import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useWindowSize } from '@/app/hooks/useWindowSize';
import { NEW_SESSION_PAGE_SESSION_ID } from '@/server/shared';

import { findTokenImmediatelyBeforeCaret } from '../smart-composer-dom';
import { buildText, SearchItem } from '../smart-composer-helpers';
import { useComposerStore } from '../smart-composer-store';

interface ComposerTextareaProps {
  enabledClassName?: string;
  editorRef: React.RefObject<HTMLDivElement | null>;

  paletteOpen: boolean;
  selectedItem: SearchItem;

  onInput: () => void;
  onCopy: (event: React.ClipboardEvent<HTMLDivElement>) => void;
  onPaste: (event: React.ClipboardEvent<HTMLDivElement>) => void;

  onUndo: () => void;
  onRedo: () => void;

  onShellEnter: () => void;
  onShellExit: () => void;

  onPaletteSelect: (item: SearchItem) => void;

  onPaletteClose: () => void;
  onPaletteMove: (direction: 1 | -1) => void;
}

export const COMPOSER_TEXTAREA_ID = 'aero-composer-textarea';

export const ComposerTextarea = React.memo(function ComposerTextarea({
  enabledClassName,
  editorRef,
  paletteOpen,
  selectedItem,
  onInput,
  onCopy,
  onPaste,
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
        event.stopPropagation();
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

    if (event.key === 'Enter' && event.shiftKey && !paletteOpen) {
      event.stopPropagation();
    }
  };

  useEffect(() => {
    if (!editorRef.current) {
      return;
    }

    editorRef.current.spellcheck = false;
  }, [editorRef]);

  const { sessionId } = useParams({ strict: false });
  const { data } = useChatInputExpanded(
    sessionId ?? NEW_SESSION_PAGE_SESSION_ID,
  );
  const enabled = data?.value ?? false;

  useEffect(() => {
    if (
      !enabled &&
      editorRef.current &&
      editorRef.current.innerHTML.trim().length === 0
    ) {
      editorRef.current.style.removeProperty('height');
    }
  }, [enabled]);

  const { pathname } = useLocation();
  const isMobile = useWindowSize((size) => size.width < 768);

  useEffect(() => {
    if (editorRef.current && !isMobile) {
      editorRef.current.focus();
    }
  }, [pathname, isMobile]);

  useKeyPress(
    'i',
    () => {
      editorRef.current?.focus();
    },
    {
      modifiers: {
        mod: true,
      },
    },
  );

  return (
    <div
      id={COMPOSER_TEXTAREA_ID}
      ref={editorRef}
      className={cn(
        enabled
          ? (enabledClassName ?? 'min-h-[calc(100svh-156px)]')
          : '@max-lg:min-h-18',
        'text-sm transition-none',
        'overflow-wrap-anywhere overflow-y-auto whitespace-pre-wrap',
        'outline-none',
        'prompt-input__textarea',
        mode === 'shell' && 'border-accent/50 font-mono',
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
  );
});
