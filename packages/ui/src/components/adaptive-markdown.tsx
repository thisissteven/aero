'use client';

import type { ComponentPropsWithRef, ReactElement, RefObject } from 'react';
import { memo, useRef } from 'react';
import type { Components } from 'react-markdown';

import { Markdown } from './markdown';
import { VirtualizedMarkdown } from './virtualized-markdown';
import { useAutoScroll } from '../hooks/useAutoScroll';

export interface AdaptiveMarkdownProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  children: string;
  components?: Partial<Components>;
  id: string;
  isFile?: (path: string) => boolean;
  /** Item size hint forwarded to VirtualizedMarkdown/virtua */
  itemSize?: number;
  onFileClick?: (path: string) => void;
  /** Ref to the actual scrollable ancestor (e.g. the wrapping ScrollShadow's ref). Required — without it virtua can't find the real viewport. */
  scrollRef?: RefObject<HTMLElement | null>;
  /**
   * Character length above which content switches to VirtualizedMarkdown.
   * Tune to your typical block size — this is intentionally a length check,
   * not a block-count check, so it's O(1) and doesn't require splitting the
   * string just to decide.
   */
  virtualizeThreshold?: number;
  isStreaming?: boolean;
}

const VIRTUALIZE_THRESHOLD = 2000;

export const AdaptiveMarkdown = memo(function AdaptiveMarkdown({
  children,
  isStreaming,
  scrollRef,
  ...props
}: AdaptiveMarkdownProps): ReactElement {
  const contentRef = useRef<HTMLDivElement>(null);

  const shouldVirtualize = children.length > VIRTUALIZE_THRESHOLD;

  useAutoScroll({
    scrollRef: scrollRef ?? { current: null },
    contentRef,
    isStreaming,
  });

  return (
    <div ref={contentRef}>
      {shouldVirtualize ? (
        <VirtualizedMarkdown
          scrollRef={scrollRef}
          streaming={isStreaming}
          {...props}
        >
          {children}
        </VirtualizedMarkdown>
      ) : (
        <Markdown scrollRef={scrollRef} streaming={isStreaming} {...props}>
          {children}
        </Markdown>
      )}
    </div>
  );
});
AdaptiveMarkdown.displayName = 'AdaptiveMarkdown';
