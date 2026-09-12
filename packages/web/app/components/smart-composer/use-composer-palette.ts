import { useParams } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { useCapabilities } from '@/app/hooks/api/capabilities';
import { useSession } from '@/app/hooks/api/sessions';
import { useFilesInDirectory } from '@/app/hooks/api/system';
import { useDebounce } from '@/app/hooks/useDebounce';

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

  const rect = range.getBoundingClientRect();

  if (rect.width || rect.height || rect.top || rect.left) {
    return {
      top: rect.top,
      bottom: rect.bottom,
      left: rect.left,
    };
  }

  const getRect = (node: Node, offset: number) => {
    const range = document.createRange();

    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length ?? 0;

      if (offset > 0 && offset <= length) {
        range.setStart(node, offset - 1);
        range.setEnd(node, offset);

        return {
          rect: range.getBoundingClientRect(),
          side: 'right' as const,
        };
      }

      if (offset < length) {
        range.setStart(node, offset);
        range.setEnd(node, offset + 1);

        return {
          rect: range.getBoundingClientRect(),
          side: 'left' as const,
        };
      }

      return null;
    }

    const child = node.childNodes[offset - 1];

    if (child) {
      if (
        child.nodeType === Node.ELEMENT_NODE &&
        (child as HTMLElement).dataset.token === 'true'
      ) {
        const childRect = (child as HTMLElement).getBoundingClientRect();

        return {
          rect: childRect,
          side: 'right' as const,
        };
      }

      const text = child.textContent ?? '';

      if (text.length) {
        const walker = document.createTreeWalker(child, NodeFilter.SHOW_TEXT);

        let lastText: Node | null = null;
        let current: Node | null;

        while ((current = walker.nextNode())) {
          lastText = current;
        }

        if (lastText) {
          const length = lastText.textContent?.length ?? 0;

          range.setStart(lastText, Math.max(0, length - 1));
          range.setEnd(lastText, length);

          return {
            rect: range.getBoundingClientRect(),
            side: 'right' as const,
          };
        }
      }

      const childRect = (child as HTMLElement).getBoundingClientRect?.();

      if (childRect) {
        return {
          rect: childRect,
          side: 'right' as const,
        };
      }
    }

    const next = node.childNodes[offset];

    if (next) {
      if (
        next.nodeType === Node.ELEMENT_NODE &&
        (next as HTMLElement).dataset.token === 'true'
      ) {
        const nextRect = (next as HTMLElement).getBoundingClientRect();

        return {
          rect: nextRect,
          side: 'left' as const,
        };
      }

      const text = next.textContent ?? '';

      if (text.length) {
        const walker = document.createTreeWalker(next, NodeFilter.SHOW_TEXT);

        const firstText = walker.nextNode();

        if (firstText) {
          range.setStart(firstText, 0);
          range.setEnd(firstText, 1);

          return {
            rect: range.getBoundingClientRect(),
            side: 'left' as const,
          };
        }
      }

      const nextRect = (next as HTMLElement).getBoundingClientRect?.();

      if (nextRect) {
        return {
          rect: nextRect,
          side: 'left' as const,
        };
      }
    }

    return null;
  };

  const fallback = getRect(range.startContainer, range.startOffset);

  if (!fallback) {
    return null;
  }

  const { rect: fallbackRect, side } = fallback;

  if (
    !fallbackRect ||
    (fallbackRect.width === 0 &&
      fallbackRect.height === 0 &&
      fallbackRect.top === 0 &&
      fallbackRect.left === 0)
  ) {
    return null;
  }

  return {
    top: fallbackRect.top,
    bottom: fallbackRect.bottom,
    left: side === 'right' ? fallbackRect.right : fallbackRect.left,
  };
}

export function useComposerPalette({ editorRef }: UseComposerPaletteOptions) {
  const mode = useComposerStore((state) => state.mode);

  const [activeTrigger, setActiveTrigger] = useState<TriggerState | null>(null);

  const [selectedIndex, setSelectedIndex] = useState(0);
  // Mirrors selectedIndex but only ever moves via moveSelection. The palette
  // uses this — not selectedIndex — to trigger scroll-into-view, so hovering
  // an item (which also writes selectedIndex, for highlight/keyboard sync)
  // never scrolls the list.
  const [scrollIndex, setScrollIndex] = useState(0);
  const [caretRect, setCaretRect] = useState<CaretRect | null>(null);

  // Keyboard navigation always wins over a stationary mouse. Set on every
  // keyboard move; cleared only by a real pointer movement (see
  // clearHoverSuppression, wired to a window pointermove listener by the
  // palette). This lives here — not in the palette component — because
  // moveSelection is the only place that actually knows a move originated
  // from the keyboard rather than from a hover.
  const ignoreHoverRef = useRef(false);

  const { sessionId } = useParams({ strict: false });
  const { data: session } = useSession(undefined, sessionId);

  const isFileTrigger = activeTrigger?.char === '@';
  const fileTriggerQueryLength = isFileTrigger ? activeTrigger.query.length : 0;

  const isWorkMode = useNewSessionStore((state) => state.state === 'work');
  const selectedDirectory = useNewSessionStore(
    (state) => state.selectedWorkspace?.directory,
  );

  const directory =
    !sessionId && isWorkMode ? selectedDirectory : session?.workspace;

  const debouncedQuery = useDebounce(activeTrigger?.query, 200);

  const { data: files = [] } = useFilesInDirectory({
    harnessId: undefined,
    directory,
    query: fileTriggerQueryLength > 0 ? debouncedQuery : undefined,
    limit: fileTriggerQueryLength > 0 ? '20' : '5',
  });

  const { data: capabilities } = useCapabilities({
    harnessId: undefined,
    directory,
  });

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

  const composerOpen = useComposerStore((state) => state.composerOpen);
  const setComposerOpen = useComposerStore((state) => state.setComposerOpen);

  const close = useCallback(() => {
    setComposerOpen(false);
    setActiveTrigger(null);
    setSelectedIndex(0);
    setScrollIndex(0);
    setCaretRect(null);
    ignoreHoverRef.current = false;
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

    setActiveTrigger(trigger);
    setCaretRect(nextCaretRect);
    setComposerOpen(true);
  }, [close, detectTrigger, editorRef]);

  const visibleFiles = isWorkMode || sessionId ? files : [];

  const search = useMemo(() => {
    const agents = capabilities?.agents ?? [];
    const commands = capabilities?.commands ?? [];
    const skills = capabilities?.skills ?? [];
    return activeTrigger
      ? unifiedSearch(activeTrigger.char, activeTrigger.query, {
          files: visibleFiles,
          agents,
          commands,
          skills,
        })
      : { groups: {}, flat: [] };
  }, [activeTrigger, capabilities, visibleFiles]);

  const results = search.flat;

  useEffect(() => {
    setSelectedIndex((current) =>
      Math.min(current, Math.max(0, results.length - 1)),
    );
  }, [results.length]);

  const selectedItem = results[selectedIndex] ?? null;

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      ignoreHoverRef.current = true;

      setSelectedIndex((current) => {
        if (!results.length) {
          setScrollIndex(0);
          return 0;
        }

        const next = (current + direction + results.length) % results.length;

        setScrollIndex(next);

        return next;
      });
    },
    [results.length],
  );

  // Hover sets the SAME index keyboard nav uses, so an arrow key press
  // after a hover continues from wherever the mouse left off instead of
  // resuming from a stale, independently-tracked index. Suppressed while
  // ignoreHoverRef is set, so the item that slides under a stationary
  // cursor during keyboard-driven scrolling doesn't steal selection back.
  const setHoverIndex = useCallback((index: number) => {
    if (ignoreHoverRef.current) {
      return;
    }

    setSelectedIndex(index);
  }, []);

  const clearHoverSuppression = useCallback(() => {
    ignoreHoverRef.current = false;
  }, []);

  useEffect(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.addEventListener('click', sync);
    editor.addEventListener('focus', sync);
    editor.addEventListener('input', sync);
    editor.addEventListener('keyup', sync);

    return () => {
      editor.removeEventListener('click', sync);
      editor.removeEventListener('focus', sync);
      editor.removeEventListener('input', sync);
      editor.removeEventListener('keyup', sync);
    };
  }, [editorRef, sync]);

  return useMemo(
    () => ({
      composerOpen,
      activeTrigger,
      results,
      selectedIndex,
      scrollIndex,
      selectedItem,
      caretRect,
      sync,
      close,
      moveSelection,
      setHoverIndex,
      clearHoverSuppression,
    }),
    [
      activeTrigger,
      caretRect,
      clearHoverSuppression,
      close,
      moveSelection,
      composerOpen,
      results,
      scrollIndex,
      selectedIndex,
      selectedItem,
      setHoverIndex,
      sync,
    ],
  );
}
