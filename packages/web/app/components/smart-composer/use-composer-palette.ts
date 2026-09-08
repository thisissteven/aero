import { useParams } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useNewSessionStore } from '@/app/features/new-session-page/new-session-store';
import { useCapabilities } from '@/app/hooks/api/capabilities';
import { useSession } from '@/app/hooks/api/sessions';
import { useFilesInDirectory } from '@/app/hooks/api/system';

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
  const [caretRect, setCaretRect] = useState<CaretRect | null>(null);

  const { sessionId } = useParams({ strict: false });
  const { data: session } = useSession(undefined, sessionId);

  const isFileTrigger = activeTrigger?.char === '@';
  const fileTriggerQueryLength = isFileTrigger ? activeTrigger.query.length : 0;

  const isWorkMode = useNewSessionStore((state) => state.state === 'work');
  const selectedDirectory = useNewSessionStore(
    (state) => state.selectedWorkspace?.directory,
  );

  const { data: files = [] } = useFilesInDirectory({
    harnessId: undefined,
    directory:
      !sessionId && isWorkMode ? selectedDirectory : session?.workspace,
    query: fileTriggerQueryLength > 0 ? activeTrigger?.query : undefined,
    limit: fileTriggerQueryLength > 0 ? '20' : '5',
  });

  const { data: capabilities } = useCapabilities({
    harnessId: undefined,
    directory: session?.workspace,
  });

  const agents = capabilities?.agents ?? [];
  const commands = capabilities?.commands ?? [];
  const skills = capabilities?.skills ?? [];

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

    setActiveTrigger(trigger);
    setCaretRect(nextCaretRect);
    setComposerOpen(true);
  }, [close, detectTrigger, editorRef]);

  const search = useMemo(
    () =>
      activeTrigger
        ? unifiedSearch(activeTrigger.char, activeTrigger.query, {
            files,
            agents,
            commands,
            skills,
          })
        : { groups: {}, flat: [] },
    [activeTrigger, agents, commands, files, skills],
  );

  const results = search.flat;

  useEffect(() => {
    setSelectedIndex((current) =>
      Math.min(current, Math.max(0, results.length - 1)),
    );
  }, [results.length]);

  const selectedItem = results[selectedIndex] ?? null;

  const moveSelection = useCallback(
    (direction: 1 | -1) => {
      setSelectedIndex((current) => {
        if (!results.length) return 0;

        return (current + direction + results.length) % results.length;
      });
    },
    [results.length],
  );

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
      composerOpen,
      results,
      selectedIndex,
      selectedItem,
      sync,
    ],
  );
}
