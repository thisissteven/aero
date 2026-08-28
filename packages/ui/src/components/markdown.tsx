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

/**
 * Rehype plugin that wraps rendered text nodes in word spans.
 *
 * This runs after Markdown has been parsed, so Markdown syntax remains intact.
 * Code blocks and inline code are intentionally skipped.
 */
function rehypeStreamingWords() {
  return function transformer(tree: HastRoot) {
    visitTextNodes(tree);
  };
}

type HastRoot = {
  type: string;
  children?: HastNode[];
};

type HastNode = {
  type: string;
  tagName?: string;
  value?: string;
  properties?: Record<string, unknown>;
  children?: HastNode[];
};

function visitTextNodes(node: HastNode, insideCode = false): void {
  if (!node.children) return;

  const nextChildren: HastNode[] = [];

  const isCodeElement =
    node.type === 'element' &&
    (node.tagName === 'code' || node.tagName === 'pre');

  const nextInsideCode = insideCode || isCodeElement;

  for (const child of node.children) {
    if (child.type === 'text' && !nextInsideCode) {
      const tokens = splitTextIntoTokens(child.value ?? '');

      for (const token of tokens) {
        if (!token) continue;

        if (/^\s+$/.test(token)) {
          nextChildren.push({
            type: 'text',
            value: token,
          });
          continue;
        }

        nextChildren.push({
          type: 'element',
          tagName: 'span',
          properties: {
            className: ['t-stream-w'],
          },
          children: [
            {
              type: 'text',
              value: token,
            },
          ],
        });
      }

      continue;
    }

    visitTextNodes(child, nextInsideCode);
    nextChildren.push(child);
  }

  node.children = nextChildren;
}

function splitTextIntoTokens(value: string): string[] {
  return value.split(/(\s+)/);
}

export interface MemoizedBlockProps {
  components: Components;
  content: string;
  streaming?: boolean;
}

export const MemoizedBlock = memo(
  function MemoizedBlock({
    components,
    content,
    streaming = false,
  }: MemoizedBlockProps): ReactElement {
    return (
      <div className='markdown__block' data-slot='markdown-block'>
        <ReactMarkdown
          components={components}
          remarkPlugins={[remarkGfm, remarkMath]}
          rehypePlugins={streaming ? [rehypeStreamingWords] : undefined}
        >
          {content}
        </ReactMarkdown>
      </div>
    );
  },
  (prev, next) =>
    prev.content === next.content &&
    prev.components === next.components &&
    prev.streaming === next.streaming,
);

export interface MarkdownProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
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
    children,
    className,
    components,
    isFile,
    onFileClick,
    streaming = false,
    ...props
  }: MarkdownProps): ReactElement {
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

    return (
      <MarkdownFileContext.Provider value={contextValue}>
        <div
          className={cn('markdown', className)}
          data-slot='markdown'
          {...props}
        >
          <MemoizedBlock
            components={renderers}
            content={children}
            streaming={streaming}
          />
        </div>
      </MarkdownFileContext.Provider>
    );
  },
);

Markdown.displayName = 'Markdown';
