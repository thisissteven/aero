'use client';

import { cn } from '@heroui/react';
import { marked } from 'marked';
import type {
  ComponentPropsWithoutRef,
  ComponentPropsWithRef,
  NamedExoticComponent,
  ReactElement,
} from 'react';
import { memo, useId, useMemo } from 'react';
import type { Components, ExtraProps } from 'react-markdown';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';

import { CodeBlock } from './code-block';

const blocks = (content: string): string[] =>
  marked.lexer(content).map((token) => token.raw);
const hash = (value: string): string => {
  let result = 0;
  for (let index = 0; index < value.length; index += 1)
    result = Math.imul(31, result) + value.charCodeAt(index);
  return (result >>> 0).toString(36);
};
const keyedBlocks = (values: string[], seed: string) => {
  const counts = new Map<string, number>();
  return values.map((content) => {
    const contentHash = hash(content);
    const count = counts.get(contentHash) ?? 0;
    counts.set(contentHash, count + 1);
    return { content, key: `${seed}-${contentHash}-${count}` };
  });
};
const languageFromClass = (className?: string): string =>
  className?.match(/language-(\w+)/)?.[1] ?? 'plaintext';
type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & ExtraProps;
function MarkdownCode({
  children,
  className,
  node,
  ...props
}: MarkdownCodeProps): ReactElement {
  const isInline =
    !node?.position?.start.line ||
    node.position.start.line === node.position.end.line;
  if (isInline)
    return (
      <code
        className={cn('markdown__inline-code', className)}
        data-slot='markdown-inline-code'
        {...props}
      >
        {children}
      </code>
    );
  const language = languageFromClass(className);
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
}
const defaultComponents: Components = {
  code: MarkdownCode,
  pre: ({ children }) => <>{children}</>,
};
interface MemoizedBlockProps {
  components: Components;
  content: string;
}
const MemoizedBlock = memo(function MemoizedBlock({
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
});
MemoizedBlock.displayName = 'MemoizedMarkdownBlock';
export interface MarkdownProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  children: string;
  components?: Partial<Components>;
  id?: string;
}
export const Markdown: NamedExoticComponent<MarkdownProps> = memo(
  function Markdown({
    children,
    className,
    components,
    id,
    ...props
  }: MarkdownProps): ReactElement {
    const generatedId = useId();
    const seed = id ?? generatedId;
    const parsed = useMemo(() => blocks(children), [children]);
    const keyed = useMemo(() => keyedBlocks(parsed, seed), [parsed, seed]);
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
        {keyed.map((block) => (
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
