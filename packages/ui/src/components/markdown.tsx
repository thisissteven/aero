'use client';

import { cn } from '@heroui/react';
import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  NamedExoticComponent,
  ReactElement,
  RefObject,
} from 'react';
import { createContext, memo, useContext, useMemo } from 'react';
import type { Components, ExtraProps } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { CodeBlock } from './code-block';

// 1. Define Context to pass file matching logic down to custom Markdown components
interface MarkdownFileContextValue {
  isFile?: (path: string) => boolean;
  onFileClick?: (path: string) => void;
}

export const MarkdownFileContext = createContext<MarkdownFileContextValue>({});

type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & ExtraProps;

const MarkdownCode = memo(function MarkdownCode({
  children,
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

export interface MemoizedBlockProps {
  components: Components;
  content: string;
}

export const MemoizedBlock = memo(
  function MemoizedBlock({
    components,
    content,
  }: MemoizedBlockProps): ReactElement {
    return (
      <div className='markdown__block' data-slot='markdown-block'>
        <ReactMarkdown
          components={components}
          remarkPlugins={[remarkGfm, remarkMath]}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  },
  (prev, next) =>
    prev.content === next.content && prev.components === next.components,
);

export interface MarkdownProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  children: string;
  components?: Partial<Components>;
  id: string; // Enforce explicitly passed stable identity keys
  /** Optional function to determine if inline code is a file path */
  isFile?: (path: string) => boolean;
  /** Optional callback triggered when a file inline code is clicked */
  onFileClick?: (path: string) => void;
  scrollRef?: RefObject<HTMLElement | null>;
}

export const Markdown: NamedExoticComponent<MarkdownProps> = memo(
  function Markdown({
    children,
    className,
    components,
    id,
    isFile,
    onFileClick,
    scrollRef,
    ...props
  }: MarkdownProps): ReactElement {
    // Completely bypass using marked.lexer during high-frequency scrolls
    const blockContent = useMemo(() => {
      const fastHash = (str: string): string => {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
          hash = (hash << 5) - hash + str.charCodeAt(i);
          hash |= 0;
        }
        return hash.toString(36);
      };

      const contentHash = fastHash(children);
      return [{ content: children, key: `${id}-${contentHash}` }];
    }, [children, id]);

    const renderers = useMemo(
      () => ({ ...defaultComponents, ...components }),
      [components],
    );

    const contextValue = useMemo(
      () => ({ isFile, onFileClick }),
      [isFile, onFileClick],
    );

    return (
      <MarkdownFileContext.Provider value={contextValue}>
        <div
          className={cn('markdown', className)}
          data-slot='markdown'
          {...props}
        >
          {blockContent.map((block) => (
            <MemoizedBlock
              components={renderers}
              content={block.content}
              key={block.key}
            />
          ))}
        </div>
      </MarkdownFileContext.Provider>
    );
  },
);

Markdown.displayName = 'Markdown';
