import { cn } from '@heroui/react';
import {
  type CSSProperties,
  memo,
  type ReactElement,
  type ReactNode,
} from 'react';
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
  /**
   * Apply the block-level settle fade. Only the last non-empty block should
   * set this — otherwise the whole markdown flashes when the stream ends.
   */
  settleFading?: boolean;
  /** Duration in ms, passed through as --md-settle-fade-ms. */
  settleFadeMs?: number;
}

const BLOCK_CACHE = new Map<string, ReactNode>();
const BLOCK_CACHE_MAX = 500;

function getCachedBlock(content: string, build: () => ReactNode): ReactNode {
  const hit = BLOCK_CACHE.get(content);
  if (hit !== undefined) {
    BLOCK_CACHE.delete(content);
    BLOCK_CACHE.set(content, hit);
    return hit;
  }

  const node = build();
  BLOCK_CACHE.set(content, node);

  if (BLOCK_CACHE.size > BLOCK_CACHE_MAX) {
    const oldest = BLOCK_CACHE.keys().next().value;
    if (oldest !== undefined) BLOCK_CACHE.delete(oldest);
  }

  return node;
}

export const MemoizedBlock = memo(
  function MemoizedBlock({
    components,
    content,
    isStreamingBlock = false,
    streamRevealTokenCount,
    settleFading = false,
    settleFadeMs,
  }: MemoizedBlockProps): ReactElement {
    const shouldReveal =
      isStreamingBlock && typeof streamRevealTokenCount === 'number';

    const rehypePlugins = shouldReveal
      ? [
          [rehypeKatex, { output: 'html' }],
          [rehypeStreamReveal, { tokenCount: streamRevealTokenCount }],
        ]
      : [[rehypeKatex, { output: 'html' }], rehypeRaw];

    const rendered = shouldReveal ? (
      <ReactMarkdown
        components={components}
        remarkPlugins={[
          remarkGfm,
          [remarkMath, { singleDollarTextMath: false }],
        ]}
        rehypePlugins={rehypePlugins as never}
      >
        {content}
      </ReactMarkdown>
    ) : (
      getCachedBlock(content, () => (
        <ReactMarkdown
          components={components}
          remarkPlugins={[
            remarkGfm,
            [remarkMath, { singleDollarTextMath: false }],
          ]}
          rehypePlugins={rehypePlugins as never}
        >
          {content}
        </ReactMarkdown>
      ))
    );

    const blockStyle: CSSProperties | undefined =
      settleFading && typeof settleFadeMs === 'number'
        ? ({ '--md-settle-fade-ms': `${settleFadeMs}ms` } as CSSProperties)
        : undefined;

    return (
      <div
        className={cn(
          'markdown__block',
          isStreamingBlock && 't-stream-active',
          settleFading && 'md-settle-fade',
        )}
        data-slot='markdown-block'
        style={blockStyle}
      >
        {rendered}
      </div>
    );
  },
  (prev, next) =>
    prev.content === next.content &&
    prev.components === next.components &&
    prev.isStreamingBlock === next.isStreamingBlock &&
    prev.streamRevealTokenCount === next.streamRevealTokenCount &&
    prev.settleFading === next.settleFading &&
    prev.settleFadeMs === next.settleFadeMs,
);

MemoizedBlock.displayName = 'MemoizedBlock';
