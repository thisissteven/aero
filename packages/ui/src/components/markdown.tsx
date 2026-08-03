'use client';

import { cn } from '@heroui/react';
import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  NamedExoticComponent,
  ReactElement,
} from 'react';
import { memo, useMemo } from 'react';
import type { Components, ExtraProps } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { CodeBlock } from './code-block';

// Quick hash utility targeting performance optimization paths
const fastHash = (str: string): string => {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
};

type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & ExtraProps;

const MarkdownCode = memo(function MarkdownCode({
  children,
  className,
  node,
  ...props
}: MarkdownCodeProps): ReactElement {
  const isInline =
    !node?.position?.start.line ||
    node.position.start.line === node.position.end.line;

  if (isInline) {
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

const defaultComponents: Components = {
  code: MarkdownCode,
  pre: ({ children }) => <>{children}</>,
};

interface MemoizedBlockProps {
  components: Components;
  content: string;
}

const MemoizedBlock = memo(
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
}

export const Markdown: NamedExoticComponent<MarkdownProps> = memo(
  function Markdown({
    children,
    className,
    components,
    id,
    ...props
  }: MarkdownProps): ReactElement {
    // Completely bypass using marked.lexer during high-frequency scrolls
    const blockContent = useMemo(() => {
      const contentHash = fastHash(children);
      return [{ content: children, key: `${id}-${contentHash}` }];
    }, [children, id]);

    const renderers = useMemo(
      () => ({ ...defaultComponents, ...components }),
      [components],
    );

    return (
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
    );
  },
);

Markdown.displayName = 'Markdown';
