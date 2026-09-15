'use client';

import { cn } from '@heroui/react';
import type {
  ComponentPropsWithRef,
  NamedExoticComponent,
  ReactElement,
  RefObject,
} from 'react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import type { Components } from 'react-markdown';
import { useAutoScroll } from '../../hooks';
import {
  defaultComponents,
  MarkdownFileContext,
  MemoizedBlock,
} from '../markdown';

/**
 * Throttles stream updates to the display refresh rate (rAF). Keeps
 * trickling toward the latest rawContent regardless of isStreaming, and
 * self-stops once caught up so it doesn't spin forever on static content.
 */
function useBufferedStream(rawContent: string): string {
  const [displayedContent, setDisplayedContent] = useState(rawContent);
  const targetRef = useRef(rawContent);
  targetRef.current = rawContent;

  useEffect(() => {
    let frameId: number | null = null;

    const step = () => {
      let caughtUp = false;

      setDisplayedContent((prev) => {
        const target = targetRef.current;
        if (prev === target) {
          caughtUp = true;
          return prev;
        }
        if (prev.length > target.length || !target.startsWith(prev)) {
          // content reset/shrank (e.g. new message) — jump straight there
          caughtUp = true;
          return target;
        }
        const diff = target.length - prev.length;
        const stepSize = Math.min(diff, 2);
        const next = target.slice(0, prev.length + stepSize);
        caughtUp = next === target;
        return next;
      });

      if (!caughtUp) frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => {
      if (frameId !== null) cancelAnimationFrame(frameId);
    };
  }, [rawContent]);

  return displayedContent;
}

export interface MarkdownProps
  extends Omit<ComponentPropsWithRef<'div'>, 'children'> {
  children: string;
  components?: Partial<Components>;
  id: string;
  isFile?: (path: string) => boolean;
  onFileClick?: (path: string) => void;
  scrollRef?: RefObject<HTMLElement | null>;
  streaming?: boolean;
}

export const Markdown: NamedExoticComponent<MarkdownProps> = memo(
  function Markdown({
    children = '',
    className,
    components,
    id,
    isFile,
    onFileClick,
    streaming = false,
    scrollRef,
    ...props
  }: MarkdownProps): ReactElement {
    const bufferedContent = useBufferedStream(children);

    const renderers = useMemo(
      () => ({
        ...defaultComponents,
        ...components,
      }),
      [components],
    );

    const contextValue = useMemo(
      () => ({
        isFile,
        onFileClick,
      }),
      [isFile, onFileClick],
    );

    // Always split the same way, whether or not streaming is still active,
    // so block keys/positions stay stable across the streaming -> settled
    // transition instead of collapsing into one block and remounting.
    const blocks = useMemo(() => {
      const parts = bufferedContent.split(/(\n\n+)/);
      const result: string[] = [];
      let current = '';

      for (let i = 0; i < parts.length; i++) {
        current += parts[i];
        if (i % 2 === 1 || i === parts.length - 1) {
          if (current) result.push(current);
          current = '';
        }
      }

      return result.length > 0 ? result : [bufferedContent];
    }, [bufferedContent]);

    const contentRef = useRef<HTMLDivElement>(null);

    useAutoScroll({
      scrollRef: scrollRef ?? { current: null },
      contentRef,
      isStreaming: streaming,
    });

    return (
      <div ref={contentRef}>
        <MarkdownFileContext.Provider value={contextValue}>
          <div
            className={cn('markdown', className)}
            data-slot='markdown'
            ref={scrollRef as RefObject<HTMLDivElement>}
            {...props}
          >
            {blocks.map((blockContent, index) => {
              const isLast = index === blocks.length - 1;
              return (
                <MemoizedBlock
                  key={`${id}-block-${index}`}
                  components={renderers}
                  content={blockContent}
                  isStreamingBlock={streaming && isLast}
                />
              );
            })}
          </div>
        </MarkdownFileContext.Provider>
      </div>
    );
  },
);

Markdown.displayName = 'Markdown';
