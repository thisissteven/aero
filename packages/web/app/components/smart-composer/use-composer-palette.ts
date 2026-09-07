import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SearchItem } from './smart-composer-helpers';
import { TRIGGER_CHARS, unifiedSearch } from './smart-composer-helpers';
import { useComposerStore } from './smart-composer-store';

interface TriggerState {
  char: '@' | '/' | '#';
  query: string;
  editableOffset: number;
}

export interface CaretRect {
  top: number;
  bottom: number;
  left: number;
}

interface UseComposerPaletteOptions {
  editorRef: React.RefObject<HTMLDivElement | null>;
}

function getEditableTextBeforeCaret(editor: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || !selection.rangeCount) {
    return '';
  }

  const range = selection.getRangeAt(0);

  if (!editor.contains(range.startContainer)) {
    return '';
  }

  const preRange = document.createRange();

  preRange.selectNodeContents(editor);
  preRange.setEnd(range.startContainer, range.startOffset);

  const wrapper = document.createElement('div');

  wrapper.appendChild(preRange.cloneContents());

  let text = '';

  const walker = document.createTreeWalker(wrapper, NodeFilter.SHOW_TEXT);

  let node: Node | null;

  while ((node = walker.nextNode())) {
    if (node.parentElement?.dataset.token === 'true') {
      continue;
    }

    text += node.textContent || '';
  }

  return text;
}

function getCaretRect(editor: HTMLElement): CaretRect | null {
  const selection = window.getSelection();

  if (!selection || !selection.rangeCount) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!range.collapsed || !editor.contains(range.startContainer)) {
    return null;
  }

  const rect = range.getClientRects()[0] ?? range.getBoundingClientRect();

  if (!rect) {
    return null;
  }

  return {
    top: rect.top,
    bottom: rect.bottom,
    left: rect.left,
  };
}

export function useComposerPalette({ editorRef }: UseComposerPaletteOptions) {
  const mode = useComposerStore((state) => state.mode);

  const [activeTrigger, setActiveTrigger] = useState<TriggerState | null>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const [open, setOpen] = useState(false);

  const [results, setResults] = useState<SearchItem[]>([]);

  const [caretRect, setCaretRect] = useState<CaretRect | null>(null);

  const detectTrigger = useCallback(() => {
    const editor = editorRef.current;

    if (!editor || mode === 'shell') {
      return null;
    }

    const text = getEditableTextBeforeCaret(editor);

    if (!text) {
      return null;
    }

    const match = text.match(/(?:^|\s)([@/#][^\s]*)$/);

    if (!match) {
      return null;
    }

    const word = match[1];

    const char = word[0] as TriggerState['char'];

    if (!TRIGGER_CHARS.includes(char)) {
      return null;
    }

    return {
      char,
      query: word.slice(1),
      editableOffset: text.length - word.length,
    };
  }, [editorRef, mode]);

  const close = useCallback(() => {
    setOpen(false);
    setActiveTrigger(null);
    setResults([]);
    setSelectedIndex(0);
    setCaretRect(null);
  }, []);

  const sync = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) {
      close();
      return;
    }

    const trigger = detectTrigger();

    if (!trigger) {
      close();
      return;
    }

    const nextCaretRect = getCaretRect(editor);

    if (!nextCaretRect) {
      close();
      return;
    }

    const search = unifiedSearch(trigger.char, trigger.query);

    const nextResults = search.flat;

    setActiveTrigger((current) => {
      if (
        current?.char === trigger.char &&
        current.query === trigger.query &&
        current.editableOffset === trigger.editableOffset
      ) {
        return current;
      }

      return trigger;
    });

    setResults((current) => {
      if (
        current.length === nextResults.length &&
        current.every((item, index) => item.id === nextResults[index].id)
      ) {
        return current;
      }

      return nextResults;
    });

    setCaretRect((current) => {
      if (
        current &&
        current.top === nextCaretRect.top &&
        current.bottom === nextCaretRect.bottom &&
        current.left === nextCaretRect.left
      ) {
        return current;
      }

      return nextCaretRect;
    });

    setSelectedIndex((current) =>
      Math.min(current, Math.max(0, nextResults.length - 1)),
    );

    setOpen(true);
  }, [close, detectTrigger, editorRef]);

  const selectedItem = results[selectedIndex] ?? null;

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      setSelectedIndex((current) =>
        Math.max(0, Math.min(current + direction, results.length - 1)),
      );
    },
    [results.length],
  );

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const syncFromCaret = () => {
      sync();
    };

    editor.addEventListener('click', syncFromCaret);

    editor.addEventListener('focus', syncFromCaret);

    return () => {
      editor.removeEventListener('click', syncFromCaret);

      editor.removeEventListener('focus', syncFromCaret);
    };
  }, [editorRef, sync]);

  return useMemo(
    () => ({
      open,
      activeTrigger,
      results,
      selectedIndex,
      selectedItem,
      caretRect,

      sync,
      close,
      moveSelection,
    }),
    [
      activeTrigger,
      caretRect,
      close,
      moveSelection,
      open,
      results,
      selectedIndex,
      selectedItem,
      sync,
    ],
  );
}
