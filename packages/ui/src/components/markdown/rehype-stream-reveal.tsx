import type { Element, Root, RootContent } from 'hast';

const SKIP_TAGS = new Set(['code', 'pre', 'svg', 'math']);

function hasKatexClass(el: Element): boolean {
  const className = el.properties?.className;
  return (
    Array.isArray(className) &&
    className.some((c) => typeof c === 'string' && c.includes('katex'))
  );
}

/**
 * Wraps each whitespace-delimited token in the tree in its own <span>,
 * tagged with a global reveal index for staggered CSS animation-delay.
 * Skips code/pre/svg/math and KaTeX output so formatting isn't disturbed.
 */
export function rehypeStreamReveal(stagger = 20) {
  return (tree: Root) => {
    let globalIndex = 0;

    function walk(node: Root | Element) {
      const children = (node as { children?: RootContent[] }).children;
      if (!children) return;

      for (let i = 0; i < children.length; i++) {
        const child = children[i];

        if (child.type === 'element') {
          if (SKIP_TAGS.has(child.tagName) || hasKatexClass(child)) continue;
          walk(child);
          continue;
        }

        if (child.type === 'text' && child.value) {
          const tokens = child.value.split(/(\s+)/).filter((t) => t.length > 0);
          if (tokens.length === 0) continue;

          const replacement: Element[] = tokens.map((token) => {
            const el: Element = {
              type: 'element',
              tagName: 'span',
              properties: {
                className: ['stream-reveal__segment'],
                style: `animation-delay:${globalIndex * stagger}ms`,
              },
              children: [{ type: 'text', value: token }],
            };
            globalIndex += 1;
            return el;
          });

          children.splice(i, 1, ...replacement);
          i += replacement.length - 1;
        }
      }
    }

    walk(tree);
  };
}
