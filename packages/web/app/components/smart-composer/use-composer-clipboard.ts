import { useCallback } from 'react';

import {
  createNodeFromSegment,
  serializeContainer,
} from './smart-composer-dom';
import { buildText, COMPOSER_CLIPBOARD_MIME } from './smart-composer-helpers';
import { useComposerStore } from './smart-composer-store';

export function useComposerClipboard(
  editorRef: React.RefObject<HTMLDivElement | null>,
) {
  const setSegments = useComposerStore((state) => state.setSegments);
  const commitHistory = useComposerStore((state) => state.commitHistory);
  const mode = useComposerStore((state) => state.mode);

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

      event.preventDefault();

      let inserted = false;

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

        range.deleteContents();
        range.insertNode(document.createTextNode(text));
        range.collapse(false);
      }

      const segments = serializeContainer(editor);

      setSegments(segments);

      commitHistory({
        segments,
        caret: getCaretOffset(editor),
        mode,
      });
    },
    [commitHistory, editorRef, mode, setSegments],
  );

  return {
    handleCopy,
    handlePaste,
  };
}

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
