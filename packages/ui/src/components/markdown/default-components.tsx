import { cn } from '@heroui/react';
import {
  ComponentPropsWithoutRef,
  memo,
  ReactElement,
  useContext,
} from 'react';
import { Components, ExtraProps } from 'react-markdown';
import { CodeBlock } from '../code-block';
import { MarkdownFileContext } from './markdown-file-context';

type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & ExtraProps;

const MarkdownCode = memo(function MarkdownCode({
  children = '',
  className,
  node,
  ...props
}: MarkdownCodeProps): ReactElement | null {
  const { isFile, onFileClick } = useContext(MarkdownFileContext);

  const isInline =
    !node?.position?.start.line ||
    node.position.start.line === node.position.end.line;

  if (isInline) {
    const rawContent = String(children ?? '').trim();
    if (rawContent.length === 0) return null;

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
