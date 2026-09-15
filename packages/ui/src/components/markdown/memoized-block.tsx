import { cn } from '@heroui/react';
import { memo, ReactElement, useRef } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { rehypeStreamReveal } from './rehype-stream-reveal';

const REVEAL_PLUGIN = [rehypeStreamReveal, { tokenCount: 8 }] as const;

// We build these spans ourselves, so we control the React key.
// React will keep existing nodes alive across re-renders and mount only
// the new trailing tokens — which is what fires @starting-style.
function StreamToken({
  node,
  children,
}: {
  node?: { properties?: Record<string, unknown> };
  children?: React.ReactNode;
}) {
  const key = node?.properties?.['data-token'];
  return (
    <span
      key={typeof key === 'string' ? key : undefined}
      className='stream-reveal__segment'
    >
      {children}
    </span>
  );
}

const STREAM_COMPONENTS = {
  'stream-token': StreamToken,
} as unknown as Partial<Components>;

export interface MemoizedBlockProps {
  components: Components;
  content: string;
  isStreamingBlock?: boolean;
}

export const MemoizedBlock = memo(
  function MemoizedBlock({
    components,
    content,
    isStreamingBlock = false,
  }: MemoizedBlockProps): ReactElement {
    // Captured once at mount. Streams that mount non-streaming never reveal.
    // The live block keeps the plugin for its whole life, so trailing spans
    // don't get torn down the instant isStreamingBlock flips to false.
    const shouldReveal = useRef(isStreamingBlock).current;

    const mergedComponents = shouldReveal
      ? { ...STREAM_COMPONENTS, ...components }
      : components;

    const rehypePlugins = shouldReveal
      ? [[rehypeKatex, { output: 'html' }], rehypeRaw, REVEAL_PLUGIN]
      : [[rehypeKatex, { output: 'html' }], rehypeRaw];

    return (
      <div
        className={cn('markdown__block', isStreamingBlock && 't-stream-active')}
        data-slot='markdown-block'
      >
        <ReactMarkdown
          components={mergedComponents}
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={rehypePlugins as never}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  },
  (prev, next) =>
    prev.content === next.content &&
    prev.components === next.components &&
    prev.isStreamingBlock === next.isStreamingBlock,
);
