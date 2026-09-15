import type { Element, Root, RootContent } from 'hast';

const SKIP_TAGS = new Set(['code', 'pre', 'svg', 'math']);

function hasKatexClass(el: Element): boolean {
  const className = el.properties?.className;
  return (
    Array.isArray(className) &&
    className.some((c) => typeof c === 'string' && c.includes('katex'))
  );
}

export interface RehypeStreamRevealOptions {
  tokenCount?: number;
}

export function rehypeStreamReveal(options: RehypeStreamRevealOptions = {}) {
  const tokenCount = options.tokenCount ?? 8;

  return (tree: Root) => {
    let target: {
      parent: Element | Root;
      index: number;
      value: string;
    } | null = null;

    function walk(node: Root | Element) {
      const children = (node as { children?: RootContent[] }).children;
      if (!children) return;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (child.type === 'element') {
          if (SKIP_TAGS.has(child.tagName) || hasKatexClass(child)) continue;
          walk(child);
        } else if (
          child.type === 'text' &&
          typeof child.value === 'string' &&
          child.value.trim().length > 0
        ) {
          target = {
            parent: node as Element | Root,
            index: i,
            value: child.value,
          };
        }
      }
    }

    walk(tree);
    if (!target) return;

    const { parent, index, value } = target;
    const parts = value.split(/(\s+)/).filter((p) => p.length > 0);
    if (parts.length === 0) return;

    const start = Math.max(0, parts.length - tokenCount);
    const replacement: RootContent[] = [];

    if (start > 0) {
      const leading = parts.slice(0, start).join('');
      if (leading) replacement.push({ type: 'text', value: leading });
    }

    for (let i = start; i < parts.length; i++) {
      // Custom element with a stable identifier we control.
      // The React component for `stream-token` builds the real span
      // with a real key, bypassing hast-util-to-jsx-runtime entirely.
      replacement.push({
        type: 'element',
        tagName: 'stream-token',
        properties: { 'data-token': `t${i}` },
        children: [{ type: 'text', value: parts[i] }],
      });
    }

    parent.children.splice(index, 1, ...replacement);
  };
}
