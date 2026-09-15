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
 * Coalesces rapid content updates into at most one per animation frame.
 * Applies the LATEST content — no character stepping, so it never falls
 * behind. The visual reveal comes from @starting-style on the trailing
 * tokens, not from throttled appends.
 *
 * Historical (non-streaming) content bypasses the scheduler entirely.
 */
function useCoalescedContent(content: string, isStreaming: boolean): string {
  const [displayed, setDisplayed] = useState(content);
  const displayedRef = useRef(displayed);
  displayedRef.current = displayed;

  const pendingRef = useRef<string | null>(null);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (!isStreaming) {
      if (displayedRef.current !== content) {
        setDisplayed(content);
      }
      return;
    }

    if (content === displayedRef.current) return;
    pendingRef.current = content;

    if (rafRef.current !== null) return;

    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const next = pendingRef.current;
      pendingRef.current = null;
      if (next !== null) setDisplayed(next);
    });
  }, [content, isStreaming]);

  useEffect(
    () => () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    },
    [],
  );

  return isStreaming ? displayed : content;
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

const NULL_REF: RefObject<HTMLElement | null> = { current: null };

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
    const bufferedContent = useCoalescedContent(children, streaming);

    const renderers = useMemo(
      () => ({ ...defaultComponents, ...components }),
      [components],
    );

    const contextValue = useMemo(
      () => ({ isFile, onFileClick }),
      [isFile, onFileClick],
    );

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
      scrollRef: scrollRef ?? NULL_REF,
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
