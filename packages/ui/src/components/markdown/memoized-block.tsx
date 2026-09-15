import { cn } from '@heroui/react';
import { memo, ReactElement } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import rehypeKatex from 'rehype-katex';
import rehypeRaw from 'rehype-raw';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { rehypeStreamReveal } from './rehype-stream-reveal';

export interface MemoizedBlockProps {
  components: Components;
  content: string;
  isStreamingBlock?: boolean;
  /** Trailing tokens to wrap during streaming. Omit to disable reveal. */
  streamRevealTokenCount?: number;
}

export const MemoizedBlock = memo(
  function MemoizedBlock({
    components,
    content,
    isStreamingBlock = false,
    streamRevealTokenCount,
  }: MemoizedBlockProps): ReactElement {
    const shouldReveal =
      isStreamingBlock && typeof streamRevealTokenCount === 'number';

    const rehypePlugins = shouldReveal
      ? [
          [rehypeKatex, { output: 'html' }],
          [rehypeStreamReveal, { tokenCount: streamRevealTokenCount }],
        ]
      : [[rehypeKatex, { output: 'html' }], rehypeRaw];

    return (
      <div
        className={cn('markdown__block', isStreamingBlock && 't-stream-active')}
        data-slot='markdown-block'
      >
        <ReactMarkdown
          components={components}
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
    prev.isStreamingBlock === next.isStreamingBlock &&
    prev.streamRevealTokenCount === next.streamRevealTokenCount,
);
