/* oxlint-disable react/no-danger -- Shiki escapes source and returns trusted highlighted markup. */
'use client';

import { Button, cn, ScrollShadow } from '@heroui/react';
import type {
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
  SVGProps,
} from 'react';
import { memo, useCallback, useEffect, useRef, useState } from 'react';
import { codeToHtml } from 'shiki';

const part = (base: string, className: unknown): string =>
  cn(base, typeof className === 'string' ? className : undefined) ?? base;

class BoundedCache<K, V> {
  private cache = new Map<K, V>();
  constructor(private readonly maxSize: number = 150) {}

  // Non-mutating read for React Render Phase
  peek(key: K): V | undefined {
    return this.cache.get(key);
  }

  get(key: K): V | undefined {
    const item = this.cache.get(key);
    if (item !== undefined) {
      this.cache.delete(key);
      this.cache.set(key, item);
    }
    return item;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== undefined) this.cache.delete(oldestKey);
    }
    this.cache.set(key, value);
  }
}

const SHIKI_HIGHLIGHT_CACHE = new BoundedCache<string, string>(150);

export async function highlightCode(
  code: string,
  {
    darkTheme = 'github-dark',
    language = 'plaintext',
    theme = 'github-light',
  }: {
    darkTheme?: string;
    language?: string;
    theme?: string;
  } = {},
): Promise<string> {
  const cacheKey = `${language}:${theme}:${darkTheme}:${code}`;
  const cached = SHIKI_HIGHLIGHT_CACHE.get(cacheKey);
  if (cached) return cached;

  const html = await codeToHtml(code, {
    defaultColor: false,
    lang: language,
    themes: { dark: darkTheme, light: theme },
  });

  SHIKI_HIGHLIGHT_CACHE.set(cacheKey, html);
  return html;
}

export interface CodeBlockRootProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

export function CodeBlockRoot({
  children,
  className,
  ...props
}: CodeBlockRootProps): ReactElement {
  return (
    <div
      className={part('code-block', className)}
      data-slot='code-block'
      {...props}
    >
      {children}
    </div>
  );
}

export interface CodeBlockHeaderProps extends ComponentPropsWithRef<'div'> {
  children: ReactNode;
}

export const CodeBlockHeader = memo(function CodeBlockHeader({
  children,
  className,
  ...props
}: CodeBlockHeaderProps): ReactElement {
  return (
    <div
      className={part('code-block__header', className)}
      data-slot='code-block-header'
      {...props}
    >
      {children}
    </div>
  );
});

export interface CodeBlockCodeProps extends ComponentPropsWithRef<'div'> {
  code: string;
  darkTheme?: string;
  highlightedHtml?: string;
  language?: string;
  showLineNumbers?: boolean;
  theme?: string;
  scrollOverflow?: boolean;
}

const HighlightedContainer = memo(function HighlightedContainer({
  html,
}: {
  html: string;
}) {
  return <div dangerouslySetInnerHTML={{ __html: html }} />;
});

export const CodeBlockCode = memo(function CodeBlockCode({
  className,
  code,
  darkTheme,
  highlightedHtml,
  language = 'plaintext',
  showLineNumbers = false,
  theme,
  scrollOverflow = false,
  ...props
}: CodeBlockCodeProps): ReactElement {
  const light = theme ?? 'github-light';
  const dark = darkTheme ?? (theme ? undefined : 'github-dark');

  const cacheKey = `${language}:${light}:${dark ?? 'none'}:${code}`;

  // Read non-destructively during render
  const initialHtml = highlightedHtml || SHIKI_HIGHLIGHT_CACHE.peek(cacheKey);
  const [highlighted, setHighlighted] = useState<string | null>(
    initialHtml || null,
  );

  useEffect(() => {
    // Check & mutate LRU cache order inside side effect safely
    const cachedHtml = SHIKI_HIGHLIGHT_CACHE.get(cacheKey);
    if (cachedHtml) {
      setHighlighted(cachedHtml);
      return;
    }

    let cancelled = false;

    async function highlight() {
      if (!code) {
        if (!cancelled) setHighlighted('<pre><code></code></pre>');
        return;
      }

      try {
        const html = dark
          ? await highlightCode(code, {
              darkTheme: dark,
              language,
              theme: light,
            })
          : await codeToHtml(code, { lang: language, theme: light });

        SHIKI_HIGHLIGHT_CACHE.set(cacheKey, html);
        if (!cancelled) setHighlighted(html);
      } catch {
        if (!cancelled) setHighlighted(null);
      }
    }

    void highlight();

    return () => {
      cancelled = true;
    };
  }, [code, dark, cacheKey, language, light]);

  return (
    <div
      className={part('code-block__code', className)}
      data-line-numbers={showLineNumbers || undefined}
      data-slot='code-block-code'
      {...props}
    >
      <ScrollShadow
        offset={2}
        className={scrollOverflow ? 'code-block__scroll' : undefined}
      >
        {highlighted ? (
          <HighlightedContainer html={highlighted} />
        ) : (
          <pre className='p-4 font-mono text-xs leading-relaxed whitespace-pre'>
            <code>{code}</code>
          </pre>
        )}
      </ScrollShadow>
    </div>
  );
});

// Static SVG Icon definitions
const CopyIcon = memo(function CopyIcon(
  props: SVGProps<SVGSVGElement>,
): ReactElement {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        clipRule='evenodd'
        d='M12 2.5H8A1.5 1.5 0 0 0 6.5 4v1H8a3 3 0 0 1 3 3v1.5h1A1.5 1.5 0 0 0 13.5 8V4A1.5 1.5 0 0 0 12 2.5M11 11h1a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v1H4a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3zM4 6.5h4A1.5 1.5 0 0 1 9.5 8v4A1.5 1.5 0 0 1 8 13.5H4A1.5 1.5 0 0 1 2.5 12V8A1.5 1.5 0 0 1 4 6.5'
        fill='currentColor'
        fillRule='evenodd'
      />
    </svg>
  );
});

const CheckIcon = memo(function CheckIcon(
  props: SVGProps<SVGSVGElement>,
): ReactElement {
  return (
    <svg
      fill='none'
      height='16'
      viewBox='0 0 16 16'
      width='16'
      xmlns='http://www.w3.org/2000/svg'
      {...props}
    >
      <path
        clipRule='evenodd'
        d='M13.488 3.43a.75.75 0 0 1 .081 1.058l-6 7a.75.75 0 0 1-1.1.042l-3.5-3.5A.75.75 0 0 1 4.03 6.97l2.928 2.927 5.473-6.385a.75.75 0 0 1 1.057-.081'
        fill='currentColor'
        fillRule='evenodd'
      />
    </svg>
  );
});

const CopyMotionIcon = memo(function CopyMotionIcon({
  copied,
}: {
  copied: boolean;
}): ReactElement {
  return (
    <span className='relative flex size-3.5 items-center justify-center'>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-all duration-200',
          copied ? 'blur-0 opacity-100' : 'opacity-0 blur-sm',
        )}
      >
        <CheckIcon className='size-3.5' />
      </span>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center transition-all duration-200',
          !copied ? 'blur-0 opacity-100' : 'opacity-0 blur-sm',
        )}
      >
        <CopyIcon className='size-3.5' />
      </span>
    </span>
  );
});

export interface CodeBlockCopyButtonProps {
  'aria-label'?: string;
  className?: string;
  code: string;
}

export const CodeBlockCopyButton = memo(function CodeBlockCopyButton({
  'aria-label': ariaLabel = 'Copy code',
  className,
  code,
}: CodeBlockCopyButtonProps): ReactElement {
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        setCopied(false);
        timeout.current = null;
      }, 2000);
    } catch {
      /* Clipboard permission guard */
    }
  }, [code]);

  return (
    <Button
      isIconOnly
      aria-label={ariaLabel}
      className={part('code-block__copy-button', className)}
      data-slot='code-block-copy-button'
      size='sm'
      variant='ghost'
      onPress={copy}
    >
      <CopyMotionIcon copied={copied} />
    </Button>
  );
});

type CodeBlockComponent = typeof CodeBlockRoot & {
  Code: typeof CodeBlockCode;
  CopyButton: typeof CodeBlockCopyButton;
  Header: typeof CodeBlockHeader;
  Root: typeof CodeBlockRoot;
};

export const CodeBlock: CodeBlockComponent = Object.assign(CodeBlockRoot, {
  Code: CodeBlockCode,
  CopyButton: CodeBlockCopyButton,
  Header: CodeBlockHeader,
  Root: CodeBlockRoot,
});
