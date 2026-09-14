'use client';

import { cn } from '@heroui/react';
import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  NamedExoticComponent,
  ReactElement,
  RefObject,
} from 'react';
import { memo, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Components, ExtraProps } from 'react-markdown';
import { useAutoScroll } from '../../hooks';
import { CodeBlock } from '../code-block';
import { MarkdownFileContext, MemoizedBlock } from '../markdown';

type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & ExtraProps;

const MarkdownCode = memo(function MarkdownCode({
  children = '',
  className,
  node,
  ...props
}: MarkdownCodeProps): ReactElement {
  const { isFile, onFileClick } = useContext(MarkdownFileContext);

  const isInline =
    !node?.position?.start.line ||
    node.position.start.line === node.position.end.line;

  if (isInline) {
    const rawContent = String(children ?? '').trim();
    const isFileMatch = isFile?.(rawContent) ?? false;

    if (isFileMatch) {
      return (
        <button
          type='button'
          onClick={() => onFileClick?.(rawContent)}
          className='inline cursor-pointer text-left transition-opacity hover:opacity-90 focus-visible:outline-none'
        >
          <code
            className={cn(
              'markdown__inline-code decoration-primary underline decoration-1 underline-offset-4',
              className,
            )}
            data-slot='markdown-inline-file-code'
            {...props}
          >
            {children}
          </code>
        </button>
      );
    }

    return (
      <code
        className={cn('markdown__inline-code', className)}
        data-slot='markdown-inline-code'
        {...props}
      >
        {children}
      </code>
    );
  }

  const language = className?.match(/language-(\w+)/)?.[1] ?? 'plaintext';
  const code = String(children ?? '').replace(/\n$/, '');

  return (
    <CodeBlock>
      <CodeBlock.Header>
        <span className='text-muted text-xs uppercase'>{language}</span>
        <CodeBlock.CopyButton code={code} />
      </CodeBlock.Header>

      <CodeBlock.Code code={code} language={language} />
    </CodeBlock>
  );
});

export const defaultComponents: Components = {
  code: MarkdownCode,
  pre: ({ children }) => <>{children}</>,
};

/**
 * Throttles stream updates to the display refresh rate (rAF)
 * for buttery-smooth character reveals without layout thrashing.
 */
function useBufferedStream(rawContent: string, isStreaming: boolean): string {
  const [displayedContent, setDisplayedContent] = useState(rawContent);
  const targetRef = useRef(rawContent);
  targetRef.current = rawContent;

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedContent(rawContent);
      return;
    }

    let frameId: number;
    const step = () => {
      setDisplayedContent((prev) => {
        const target = targetRef.current;
        if (prev === target) return prev;

        const diff = target.length - prev.length;
        if (diff <= 0) return target;

        // Slow down the stagger speed: append only 1-2 characters per rAF frame (~60-120 chars/sec)
        const stepSize = Math.min(diff, 24);
        return target.slice(0, prev.length + stepSize);
      });

      frameId = requestAnimationFrame(step);
    };

    frameId = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frameId);
  }, [isStreaming, rawContent]);

  return isStreaming ? displayedContent : rawContent;
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
    const bufferedContent = useBufferedStream(children, streaming);

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

    // Split stream content into distinct block chunks (by double newlines)
    // to preserve DOM stability for completed paragraphs.
    const blocks = useMemo(() => {
      if (!streaming) return [bufferedContent];

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
    }, [bufferedContent, streaming]);

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
