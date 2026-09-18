import { useCallback } from 'react';
import { useSessionId } from '@/app/providers/SessionIdProvider';
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
import { cloneSegments } from './smart-composer-helpers';
import {
  ComposerMode,
  getComposerSession,
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

  const sessionId = useSessionId();

  const captureSnapshot = useCallback(
    (modeOverride?: ComposerMode) => {
      const editor = editorRef.current;

      if (!editor) {
        return null;
      }

      const mode =
        modeOverride ??
        getComposerSession(useComposerStore.getState(), sessionId).mode;

      return {
        segments: cloneSegments(serializeEditor(editor)),
        caret: getCaretVisibleOffset(editor),
        mode,
      };
    },
    [editorRef, sessionId],
  );

  const syncFromDom = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const segments = serializeEditor(editor);

    setSegments(sessionId, segments);

    return segments;
  }, [editorRef, sessionId, setSegments]);

  const commitFromDom = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const state = getComposerSession(useComposerStore.getState(), sessionId);

    const segments = serializeEditor(editor);

    setSegments(sessionId, segments);

    commitHistory(sessionId, {
      segments,
      caret: getCaretVisibleOffset(editor),
      mode: state.mode,
    });
  }, [commitHistory, sessionId, editorRef, setSegments]);

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

      setSegments(sessionId, snapshot.segments);

      setMode(sessionId, snapshot.mode);

      requestAnimationFrame(() => {
        restoreCaretVisibleOffset(editor, snapshot.caret);
      });
    },
    [editorRef, sessionId, setMode, setSegments],
  );

  const handleUndo = useCallback(() => {
    const snapshot = undo(sessionId);

    restoreSnapshot(snapshot);
  }, [restoreSnapshot, undo, sessionId]);

  const handleRedo = useCallback(() => {
    const snapshot = redo(sessionId);

    restoreSnapshot(snapshot);
  }, [redo, sessionId, restoreSnapshot]);

  const initialize = useCallback(() => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    const segments = serializeEditor(editor);

    const mode = getComposerSession(
      useComposerStore.getState(),
      sessionId,
    ).mode;

    initializeHistory(sessionId, {
      segments,
      caret: getCaretVisibleOffset(editor),
      mode,
    });
  }, [editorRef, sessionId, initializeHistory]);

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
  };
}
