import { useCallback } from 'react';

import {
  createNodeFromSegment,
  findTokenImmediatelyBeforeCaret,
  getCaretVisibleOffset,
  replaceEditorContent,
  restoreCaretVisibleOffset,
  serializeEditor,
  textOffsetToPointEditable,
} from './smart-composer-dom';
import type { ComposerSegment, SearchItem } from './smart-composer-helpers';
import { buildText, cloneSegments } from './smart-composer-helpers';
import {
  ComposerMode,
  ComposerPayload,
  useComposerStore,
} from './smart-composer-store';

interface UseSmartComposerOptions {
  editorRef: React.RefObject<HTMLDivElement | null>;
}

export function useSmartComposer({ editorRef }: UseSmartComposerOptions) {
  const setSegments = useComposerStore((state) => state.setSegments);

  const setMode = useComposerStore((state) => state.setMode);

  const initializeHistory = useComposerStore(
    (state) => state.initializeHistory,
  );

  const commitHistory = useComposerStore((state) => state.commitHistory);

  const undo = useComposerStore((state) => state.undo);

  const redo = useComposerStore((state) => state.redo);

  const captureSnapshot = useCallback(
    (modeOverride?: ComposerMode) => {
      const editor = editorRef.current;

      if (!editor) {
        return null;
      }

      const mode = modeOverride ?? useComposerStore.getState().mode;

      return {
        segments: cloneSegments(serializeEditor(editor)),
        caret: getCaretVisibleOffset(editor),
        mode,
      };
    },
    [editorRef],
  );

  const syncFromDom = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const segments = serializeEditor(editor);

    setSegments(segments);

    return segments;
  }, [editorRef, setSegments]);

  const commitFromDom = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const state = useComposerStore.getState();

    const segments = serializeEditor(editor);

    setSegments(segments);

    commitHistory({
      segments,
      caret: getCaretVisibleOffset(editor),
      mode: state.mode,
    });
  }, [commitHistory, editorRef, setSegments]);

  const restoreSnapshot = useCallback(
    (
      snapshot: {
        segments: ComposerSegment[];
        caret: number;
        mode: 'normal' | 'shell';
      } | null,
    ) => {
      if (!snapshot) {
        return;
      }

      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      replaceEditorContent(editor, snapshot.segments);

      setSegments(snapshot.segments);

      setMode(snapshot.mode);

      requestAnimationFrame(() => {
        restoreCaretVisibleOffset(editor, snapshot.caret);
      });
    },
    [editorRef, setMode, setSegments],
  );

  const handleUndo = useCallback(() => {
    const snapshot = undo();

    restoreSnapshot(snapshot);
  }, [restoreSnapshot, undo]);

  const handleRedo = useCallback(() => {
    const snapshot = redo();

    restoreSnapshot(snapshot);
  }, [redo, restoreSnapshot]);

  const initialize = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const segments = serializeEditor(editor);

    const mode = useComposerStore.getState().mode;

    initializeHistory({
      segments,
      caret: getCaretVisibleOffset(editor),
      mode,
    });
  }, [editorRef, initializeHistory]);

  const insertToken = useCallback(
    (item: SearchItem, editableOffset: number) => {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      const selection = window.getSelection();

      if (!selection || !selection.rangeCount) {
        return;
      }

      const currentRange = selection.getRangeAt(0);

      const triggerPoint = textOffsetToPointEditable(editor, editableOffset);

      const replacementRange = document.createRange();

      replacementRange.setStart(triggerPoint.node, triggerPoint.offset);

      replacementRange.setEnd(
        currentRange.startContainer,
        currentRange.startOffset,
      );

      const before = captureSnapshot();

      if (!before) {
        return;
      }

      replacementRange.deleteContents();

      const span = createNodeFromSegment({
        type: 'token',
        token: {
          id: item.id,
          type: item.kind,
          label: item.label,
          value: item.value,
          trigger: item.triggerChar,
        },
      }) as HTMLElement;

      replacementRange.insertNode(span);

      const space = document.createTextNode(' ');

      span.parentNode?.insertBefore(space, span.nextSibling);

      const nextRange = document.createRange();

      nextRange.setStart(space, 1);
      nextRange.collapse(true);

      selection.removeAllRanges();
      selection.addRange(nextRange);

      commitFromDom();
    },
    [captureSnapshot, commitFromDom, editorRef],
  );

  const unwrapToken = useCallback(
    (token: HTMLElement) => {
      const parent = token.parentNode;

      if (!parent) {
        return;
      }

      const before = captureSnapshot();

      if (!before) {
        return;
      }

      const textNode = document.createTextNode(token.textContent || '');

      const next = token.nextSibling;

      // Remove the automatically inserted separator too.
      if (next?.nodeType === Node.TEXT_NODE && next.textContent === ' ') {
        next.remove();
      }

      parent.replaceChild(textNode, token);

      const range = document.createRange();

      range.setStart(textNode, textNode.textContent?.length || 0);

      range.collapse(true);

      const selection = window.getSelection();

      selection?.removeAllRanges();
      selection?.addRange(range);

      commitFromDom();
    },
    [captureSnapshot, commitFromDom],
  );

  const setPayload = useComposerStore((state) => state.setPayload);

  const submit = useCallback(
    (onSubmit?: (payload: ComposerPayload) => void) => {
      const editor = editorRef.current;

      if (!editor) {
        return;
      }

      const state = useComposerStore.getState();

      const segments = serializeEditor(editor);
      const text = buildText(segments);

      const payload: ComposerPayload =
        state.mode === 'shell'
          ? {
              text,
              segments: [
                {
                  type: 'shell',
                  text,
                },
              ],
            }
          : {
              text,
              segments,
            };

      setPayload(payload);

      onSubmit?.(payload);

      editor.innerHTML = '';

      setSegments([]);
      setMode('normal');

      initializeHistory({
        segments: [],
        caret: 0,
        mode: 'normal',
      });

      editor.focus();

      return payload;
    },
    [editorRef, initializeHistory, setMode, setPayload, setSegments],
  );

  return {
    captureSnapshot,
    syncFromDom,
    commitFromDom,
    restoreSnapshot,

    handleUndo,
    handleRedo,

    initialize,

    insertToken,
    unwrapToken,

    findPreviousToken: () => {
      const editor = editorRef.current;

      return editor ? findTokenImmediatelyBeforeCaret(editor) : null;
    },

    submit,
  };
}
