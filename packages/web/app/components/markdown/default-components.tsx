import { cn } from '@aero/ui';
import {
  ComponentPropsWithoutRef,
  memo,
  ReactElement,
  useContext,
  useMemo,
} from 'react';
import { Components, ExtraProps } from 'react-markdown';
import { getPierreTheme } from '@/app/components/chat-aside/files/pierre-styles';
import { getExtensionFromLanguage } from '@/app/components/markdown/get-extension-from-language';
import { useTheme } from '@/app/providers/theme';
import { CodeBlock } from '../code-block/code-block';
import { MarkdownFileContext } from './markdown-file-context';
import { MermaidDiagram } from './mermaid-diagram';
import { SvgBlock } from './svg-block';

type MarkdownCodeProps = ComponentPropsWithoutRef<'code'> & ExtraProps;

const MarkdownCode = memo(function MarkdownCode({
  children = '',
  className,
  node,
  ...props
}: MarkdownCodeProps): ReactElement | null {
  const { resolvedTheme, colorTheme } = useTheme();

  const pierreTheme = useMemo(() => getPierreTheme(colorTheme), [colorTheme]);

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
              'markdown__inline-code underline decoration-1 underline-offset-4',
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

  const language = getExtensionFromLanguage(
    className?.match(/language-(\w+)/)?.[1] ?? 'text',
  );
  const code = String(children ?? '').replace(/\n$/, '');

  // Fenced ```mermaid — render as a diagram, not a code block.
  if (language === 'mmd') {
    return <MermaidDiagram code={code} />;
  }

  // Fenced ```svg — render as a sanitized inline graphic, not a code block.
  if (language === 'svg') {
    return <SvgBlock code={code} />;
  }

  return (
    <CodeBlock className='bg-background'>
      <CodeBlock.Header className='bg-surface'>
        <span className='text-foreground text-xs uppercase'>{language}</span>
        <div className='flex justify-end items-center'>
          <CodeBlock.WrapButton />
          <CodeBlock.CopyButton code={code} />
        </div>
      </CodeBlock.Header>

      <CodeBlock.Code
        code={code}
        language={language}
        theme={pierreTheme.light}
        darkTheme={pierreTheme.dark}
        // Pierre does NOT infer which theme to use from the `theme` object.
        // Without this, light mode renders with the wrong token palette.
        themeType={resolvedTheme}
        className='p-1'
      />
    </CodeBlock>
  );
});

type MarkdownLinkProps = ComponentPropsWithoutRef<'a'> & ExtraProps;

const MarkdownLink = memo(function MarkdownLink({
  children,
  className,
  href,
  ...props
}: MarkdownLinkProps): ReactElement {
  return (
    <a
      href={href}
      target='_blank'
      rel='noopener noreferrer'
      className={cn(
        'text-accent-soft-foreground underline decoration-dashed decoration-[1px] underline-offset-2',
        'transition-opacity hover:opacity-80',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-sm',
        className,
      )}
      {...props}
    >
      {children}
    </a>
  );
});

export const defaultComponents: Components = {
  code: MarkdownCode,
  pre: ({ children }) => <>{children}</>,
  a: MarkdownLink,
};
