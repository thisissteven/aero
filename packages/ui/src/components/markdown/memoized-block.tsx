import { cn } from '@heroui/react';
import { memo, ReactElement, useRef } from 'react';
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
}

export const MemoizedBlock = memo(
  function MemoizedBlock({
    components,
    content,
    isStreamingBlock = false,
  }: MemoizedBlockProps): ReactElement {
    // Captured once, at mount: same "was this block born streaming" trick as
    // BaseTool. History blocks that mount with isStreamingBlock=false never
    // reveal-animate. The live block keeps revealing even after the parent
    // flips isStreamingBlock to false when the stream ends, so in-flight
    // fades finish instead of getting yanked out with the plugin.
    const shouldReveal = useRef(isStreamingBlock).current;

    const rehypePlugins = shouldReveal
      ? [[rehypeKatex, { output: 'html' }], rehypeRaw, [rehypeStreamReveal, 20]]
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
    prev.isStreamingBlock === next.isStreamingBlock,
);
