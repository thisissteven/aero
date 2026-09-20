import { useCallback } from 'react';
import { useExternalPartsStore } from '@/app/features/chat-page/chat-input/external-parts-store';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import {
  createNodeFromSegment,
  serializeContainer,
} from './smart-composer-dom';
import { buildText, COMPOSER_CLIPBOARD_MIME } from './smart-composer-helpers';
import { getComposerSession, useComposerStore } from './smart-composer-store';

/* ------------------------------------------------------------------ */
/*  Paste thresholds                                                   */
/* ------------------------------------------------------------------ */

/** Pasted text with more than this many lines becomes a `.txt` file. */
const MAX_PASTED_LINES = 20;
/** …or this many characters, whichever trips first (catches one long line). */
const MAX_PASTED_CHARS = 2_000;

export function useComposerClipboard(
  editorRef: React.RefObject<HTMLDivElement | null>,
) {
  const sessionId = useSessionId();

  const setSegments = useComposerStore((state) => state.setSegments);
  const commitHistory = useComposerStore((state) => state.commitHistory);
  const mode = useComposerStore(
    (state) => getComposerSession(state, sessionId).mode,
  );

  const addFileAttachment = useExternalPartsStore(
    (state) => state.addFileAttachment,
  );
  const addFileAttachments = useExternalPartsStore(
    (state) => state.addFileAttachments,
  );

  const handleCopy = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const editor = editorRef.current;

      if (!editor) return;

      const selection = window.getSelection();

      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);

      if (!editor.contains(range.startContainer)) return;

      const wrapper = document.createElement('div');

      wrapper.appendChild(range.cloneContents());

      const segments = serializeContainer(wrapper);

      event.preventDefault();

      event.clipboardData.setData(
        COMPOSER_CLIPBOARD_MIME,
        JSON.stringify({
          version: 1,
          segments,
        }),
      );

      event.clipboardData.setData('text/plain', buildText(segments));

      const htmlWrapper = document.createElement('div');

      for (const segment of segments) {
        htmlWrapper.appendChild(createNodeFromSegment(segment));
      }

      event.clipboardData.setData('text/html', htmlWrapper.innerHTML);
    },
    [editorRef],
  );

  const handlePaste = useCallback(
    (event: React.ClipboardEvent<HTMLDivElement>) => {
      const editor = editorRef.current;

      if (!editor) return;

      const selection = window.getSelection();

      if (!selection || !selection.rangeCount) return;

      const range = selection.getRangeAt(0);

      if (!editor.contains(range.startContainer)) return;

      // --- 1. Binary payloads (screenshots, images, PDFs, files) ---
      // These never belong inline, so they always become attachments.
      const files = getClipboardFiles(event.clipboardData);

      if (files.length > 0) {
        event.preventDefault();
        addFileAttachments(sessionId, files);
        return;
      }

      event.preventDefault();

      let inserted = false;

      // --- 2. Rich composer payload (copy/paste inside the composer) ---
      const structured = event.clipboardData.getData(COMPOSER_CLIPBOARD_MIME);

      if (structured) {
        try {
          const parsed = JSON.parse(structured);

          if (parsed?.version === 1 && Array.isArray(parsed.segments)) {
            range.deleteContents();

            const fragment = document.createDocumentFragment();

            for (const segment of parsed.segments) {
              fragment.appendChild(createNodeFromSegment(segment));
            }

            range.insertNode(fragment);
            range.collapse(false);

            inserted = true;
          }
        } catch {
          // Fall through to plain text.
        }
      }

      if (!inserted) {
        const text = event.clipboardData.getData('text/plain');

        // --- 3. Big external text → .txt attachment instead of a wall ---
        if (shouldAttachAsFile(text)) {
          addFileAttachment(sessionId, createTextFile(text));
          return; // DOM untouched → no segment/history churn
        }

        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      }

      const segments = serializeContainer(editor);

      setSegments(sessionId, segments);

      commitHistory(sessionId, {
        segments,
        caret: getCaretOffset(editor),
        mode,
      });
    },
    [
      commitHistory,
      sessionId,
      editorRef,
      mode,
      setSegments,
      addFileAttachment,
      addFileAttachments,
    ],
  );

  return {
    handleCopy,
    handlePaste,
  };
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function getCaretOffset(editor: HTMLElement) {
  const selection = window.getSelection();

  if (!selection || !selection.rangeCount) {
    return 0;
  }

  const range = selection.getRangeAt(0);
  const preRange = document.createRange();

  preRange.selectNodeContents(editor);
  preRange.setEnd(range.startContainer, range.startOffset);

  return preRange.toString().length;
}

/** Collect every file-ish item on the clipboard (images, PDFs, real files). */
function getClipboardFiles(data: DataTransfer): File[] {
  const files: File[] = [];

  for (const item of Array.from(data.items)) {
    if (item.kind !== 'file') continue;

    const file = item.getAsFile();

    if (file) files.push(file);
  }

  // Some browsers only populate `files` for certain paste sources.
  if (files.length === 0) {
    for (const file of Array.from(data.files)) {
      if (!files.includes(file)) files.push(file);
    }
  }

  return files;
}

function shouldAttachAsFile(text: string): boolean {
  if (!text) return false;

  return (
    text.split('\n').length > MAX_PASTED_LINES || text.length > MAX_PASTED_CHARS
  );
}

/**
 * Wrap pasted text in a `File` so the attachment store can own it.
 * Names it after the first meaningful line, Claude/Codex style.
 */
function createTextFile(text: string): File {
  const firstLine =
    text
      .split('\n')
      .find((line) => line.trim())
      ?.trim() ?? '';

  const base = firstLine
    .slice(0, 40)
    .replace(/[\\/:*?"<>|]/g, '')
    .trim();

  return new File([text], `${base || 'pasted-text'}.txt`, {
    type: 'text/plain',
  });
}
