import type { ComposerSegment, TokenType } from './smart-composer-helpers';

export const TOKEN_COLOR_MAP = {
  file: 'text-accent',
  agent: 'text-accent-soft-foreground',
  skill: 'text-success',
  command: 'text-warning',
  snippet: 'text-danger',
};

export function createNodeFromSegment(segment: ComposerSegment): Node {
  if (segment.type === 'text') {
    return document.createTextNode(segment.text || '');
  }

  const { token } = segment;

  const span = document.createElement('span');

  const tokenColor = TOKEN_COLOR_MAP[token.type];

  span.className = `token ${tokenColor}`;

  span.contentEditable = 'false';

  span.dataset.token = 'true';
  span.dataset.tokenType = token.type;
  span.dataset.id = token.id || '';
  span.dataset.value = token.value || '';
  span.dataset.trigger = token.trigger || '@';

  span.textContent = token.label || token.value || '';

  return span;
}

export function serializeContainer(root: Node): ComposerSegment[] {
  const segments: ComposerSegment[] = [];

  const visit = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      const text = node.textContent || '';

      if (text) {
        segments.push({
          type: 'text',
          text,
        });
      }

      return;
    }

    if (node.nodeType !== Node.ELEMENT_NODE) {
      return;
    }

    const el = node as HTMLElement;

    if (el.dataset.token === 'true') {
      segments.push({
        type: 'token',
        token: {
          id: el.dataset.id || el.dataset.value || el.textContent || '',

          type: (el.dataset.tokenType || 'snippet') as TokenType,

          label: el.textContent || '',

          value: el.dataset.value || el.textContent || '',

          trigger: (el.dataset.trigger || '@') as '@' | '/' | '#',
        },
      });

      return;
    }

    for (const child of el.childNodes) {
      visit(child);
    }
  };

  for (const child of root.childNodes) {
    visit(child);
  }

  return segments;
}

export function serializeEditor(editor: HTMLElement) {
  return serializeContainer(editor);
}

export function replaceEditorContent(
  editor: HTMLElement,
  segments: ComposerSegment[],
) {
  editor.innerHTML = '';

  for (const segment of segments) {
    editor.appendChild(createNodeFromSegment(segment));
  }
}

export function getVisibleLength(node: Node): number {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent?.length || 0;
  }

  if (
    node.nodeType === Node.ELEMENT_NODE &&
    (node as HTMLElement).dataset.token === 'true'
  ) {
    return node.textContent?.length || 0;
  }

  let total = 0;

  for (const child of node.childNodes) {
    total += getVisibleLength(child);
  }

  return total;
}

export function getCaretVisibleOffset(editor: HTMLElement): number {
  const selection = window.getSelection();

  if (!selection || !selection.rangeCount) {
    return 0;
  }

  const range = selection.getRangeAt(0);

  if (!editor.contains(range.startContainer)) {
    return 0;
  }

  let offset = 0;
  let found = false;

  const walk = (node: Node) => {
    if (found) {
      return;
    }

    if (node === range.startContainer) {
      if (node.nodeType === Node.TEXT_NODE) {
        offset += Math.min(range.startOffset, node.textContent?.length || 0);
      } else {
        for (let i = 0; i < range.startOffset; i += 1) {
          offset += getVisibleLength(node.childNodes[i]);
        }
      }

      found = true;
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      offset += node.textContent?.length || 0;
      return;
    }

    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as HTMLElement).dataset.token === 'true'
    ) {
      offset += node.textContent?.length || 0;
      return;
    }

    for (const child of node.childNodes) {
      walk(child);

      if (found) {
        return;
      }
    }
  };

  walk(editor);

  return found ? offset : 0;
}

export function restoreCaretVisibleOffset(
  editor: HTMLElement,
  targetOffset: number,
) {
  const selection = window.getSelection();

  if (!selection) {
    return;
  }

  const desired = Math.max(0, targetOffset || 0);

  let offset = 0;
  let restored = false;

  const placeBefore = (node: Node) => {
    const range = document.createRange();

    range.setStartBefore(node);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    restored = true;
  };

  const placeAfter = (node: Node) => {
    const range = document.createRange();

    range.setStartAfter(node);
    range.collapse(true);

    selection.removeAllRanges();
    selection.addRange(range);

    restored = true;
  };

  const walk = (node: Node) => {
    if (restored) {
      return;
    }

    if (node.nodeType === Node.TEXT_NODE) {
      const length = node.textContent?.length || 0;

      if (desired <= offset + length) {
        const range = document.createRange();

        range.setStart(node, Math.max(0, desired - offset));

        range.collapse(true);

        selection.removeAllRanges();
        selection.addRange(range);

        restored = true;
        return;
      }

      offset += length;
      return;
    }

    if (
      node.nodeType === Node.ELEMENT_NODE &&
      (node as HTMLElement).dataset.token === 'true'
    ) {
      const length = node.textContent?.length || 0;

      if (desired < offset + length / 2) {
        placeBefore(node);
      } else if (desired <= offset + length) {
        placeAfter(node);
      } else {
        offset += length;
      }

      return;
    }

    for (const child of node.childNodes) {
      walk(child);

      if (restored) {
        return;
      }
    }
  };

  walk(editor);

  if (!restored) {
    const range = document.createRange();

    range.selectNodeContents(editor);
    range.collapse(false);

    selection.removeAllRanges();
    selection.addRange(range);
  }
}

export function textOffsetToPointEditable(root: HTMLElement, offset: number) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  let count = 0;
  let node: Node | null;

  while ((node = walker.nextNode())) {
    if (node.parentElement?.dataset.token === 'true') {
      continue;
    }

    const length = node.textContent?.length || 0;

    if (count + length >= offset) {
      return {
        node,
        offset: Math.max(0, offset - count),
      };
    }

    count += length;
  }

  let last: Node | null = null;

  const walker2 = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);

  while ((node = walker2.nextNode())) {
    if (node.parentElement?.dataset.token !== 'true') {
      last = node;
    }
  }

  if (last) {
    return {
      node: last,
      offset: last.textContent?.length || 0,
    };
  }

  return {
    node: root,
    offset: root.childNodes.length,
  };
}

export function findTokenImmediatelyBeforeCaret(
  editor: HTMLElement,
): HTMLElement | null {
  const selection = window.getSelection();

  if (!selection || !selection.rangeCount) {
    return null;
  }

  const range = selection.getRangeAt(0);

  if (!range.collapsed || !editor.contains(range.startContainer)) {
    return null;
  }

  let container: Node = range.startContainer;
  const offset = range.startOffset;

  // Caret inside a text node.
  if (container.nodeType === Node.TEXT_NODE) {
    const text = container.textContent || '';

    // If there is text before the caret, check whether the
    // text immediately before the caret is our separator.
    if (offset > 0) {
      const previousChar = text[offset - 1];

      if (previousChar !== ' ') {
        return null;
      }

      // The separator is directly before the caret.
      // Continue by looking at the parent and the text node itself.
    }

    const parent = container.parentNode;

    if (!parent) {
      return null;
    }

    container = parent;

    const index = Array.prototype.indexOf.call(
      parent.childNodes,
      range.startContainer,
    );

    // If caret is at the start of the text node, the token
    // can be the previous sibling.
    if (offset === 0) {
      const previous = parent.childNodes[index - 1];

      if (
        previous instanceof HTMLElement &&
        previous.dataset.token === 'true'
      ) {
        return previous;
      }

      return null;
    }

    // We are inside the separator text node.
    // Only treat it as token-adjacent if the text is exactly
    // one trailing space.
    if (text === ' ' && offset === 1) {
      const previous = parent.childNodes[index - 1];

      if (
        previous instanceof HTMLElement &&
        previous.dataset.token === 'true'
      ) {
        return previous;
      }
    }

    return null;
  }

  // Caret directly in an element node.
  if (container instanceof HTMLElement) {
    const previous = container.childNodes[offset - 1];

    if (previous instanceof HTMLElement && previous.dataset.token === 'true') {
      return previous;
    }
  }

  return null;
}
