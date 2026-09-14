import { cn } from '@heroui/react';
import { memo, ReactElement, useMemo } from 'react';
import ReactMarkdown, { Components } from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

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
    const streamingComponents = useMemo(() => {
      if (!isStreamingBlock) return components;

      return {
        ...components,
        text({ children }: { children?: React.ReactNode }) {
          if (typeof children !== 'string') return <>{children}</>;

          const splitIndex = Math.max(0, children.length - 3);
          const stableBody = children.slice(0, splitIndex);
          const activeTail = children.slice(splitIndex);

          if (!activeTail) return <>{children}</>;

          return (
            <>
              {stableBody}
              <span
                key={`tail-${children.length}`}
                className='markdown__stream-tail'
              >
                {activeTail}
              </span>
            </>
          );
        },
      };
    }, [components, isStreamingBlock]);

    return (
      <div
        className={cn('markdown__block', isStreamingBlock && 't-stream-active')}
        data-slot='markdown-block'
      >
        <ReactMarkdown
          components={streamingComponents}
          remarkPlugins={[remarkGfm, remarkMath]}
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
