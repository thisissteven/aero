import { useCallback, useEffect, useMemo, useState } from 'react';

import type { SearchItem } from './smart-composer-helpers';
import { TRIGGER_CHARS, unifiedSearch } from './smart-composer-helpers';
import { useComposerStore } from './smart-composer-store';

interface TriggerState {
  char: '@' | '/' | '#';
  query: string;
  editableOffset: number;
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

export function useComposerPalette({ editorRef }: UseComposerPaletteOptions) {
  const mode = useComposerStore((state) => state.mode);

  const [activeTrigger, setActiveTrigger] = useState<TriggerState | null>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);

  const [open, setOpen] = useState(false);

  const [results, setResults] = useState<SearchItem[]>([]);

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
  }, []);

  const sync = useCallback(() => {
    const trigger = detectTrigger();

    if (!trigger) {
      close();
      return;
    }

    const search = unifiedSearch(trigger.char, trigger.query);

    setActiveTrigger(trigger);
    setResults(search.flat);
    setOpen(true);

    setSelectedIndex((current) =>
      Math.min(current, Math.max(0, search.flat.length - 1)),
    );
  }, [close, detectTrigger]);

  const selectedItem = results[selectedIndex] || null;

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

    const onPositionChange = () => {
      sync();
    };

    editor.addEventListener('keyup', onPositionChange);

    editor.addEventListener('click', onPositionChange);

    editor.addEventListener('focus', onPositionChange);

    return () => {
      editor.removeEventListener('keyup', onPositionChange);

      editor.removeEventListener('click', onPositionChange);

      editor.removeEventListener('focus', onPositionChange);
    };
  }, [editorRef, sync]);

  return useMemo(
    () => ({
      open,
      activeTrigger,
      results,
      selectedIndex,
      selectedItem,

      sync,
      close,

      moveSelection,
    }),
    [
      activeTrigger,
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
