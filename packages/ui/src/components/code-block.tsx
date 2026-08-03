/* oxlint-disable react/no-danger -- Shiki escapes source and returns trusted highlighted markup. */
'use client';

import { Button, cn } from '@heroui/react';
import {
  AnimatePresence,
  domAnimation,
  LazyMotion,
  m,
  useReducedMotion,
} from 'motion/react';
import type {
  ComponentPropsWithRef,
  ReactElement,
  ReactNode,
  SVGProps,
} from 'react';
import {
  createContext,
  memo,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { codeToHtml } from 'shiki';

const Context = createContext(true);
const part = (base: string, className: unknown): string =>
  cn(base, typeof className === 'string' ? className : undefined) ?? base;

// ⚡ GLOBAL GLOBAL MEMORY CACHE MAP FOR HIGHLIGHTED HTML
const SHIKI_HIGHLIGHT_CACHE = new Map<string, string>();

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
  if (SHIKI_HIGHLIGHT_CACHE.has(cacheKey)) {
    return SHIKI_HIGHLIGHT_CACHE.get(cacheKey)!;
  }

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
    <Context value>
      <div
        className={part('code-block', className)}
        data-slot='code-block'
        {...props}
      >
        {children}
      </div>
    </Context>
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
  useContext(Context);
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
}

// ⚡ MEMOIZED FOR THE VIRTUALIZER VIEWPORT
export const CodeBlockCode = memo(function CodeBlockCode({
  className,
  code,
  darkTheme,
  highlightedHtml,
  language = 'plaintext',
  showLineNumbers = false,
  theme,
  ...props
}: CodeBlockCodeProps): ReactElement {
  useContext(Context);
  const light = theme ?? 'github-light';
  const dark = darkTheme ?? (theme ? undefined : 'github-dark');
  const key = `${language}:${light}:${dark ?? 'none'}:${code}`;

  // Synchronously seed the initial state from cache if it exists
  const initialHtml = highlightedHtml || SHIKI_HIGHLIGHT_CACHE.get(key);

  const [highlighted, setHighlighted] = useState<{
    html: string;
    key: string;
  } | null>(initialHtml ? { html: initialHtml, key } : null);

  useEffect(() => {
    // If state matches current key, skip parsing
    if (highlighted?.key === key) return;

    // Check memory cache synchronously first
    const cachedHtml = SHIKI_HIGHLIGHT_CACHE.get(key);
    if (cachedHtml) {
      setHighlighted({ html: cachedHtml, key });
      return;
    }

    let cancelled = false;
    async function highlight() {
      if (!code) {
        if (!cancelled)
          setHighlighted({ html: '<pre><code></code></pre>', key });
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

        // Cache the newly processed code block
        SHIKI_HIGHLIGHT_CACHE.set(key, html);

        if (!cancelled) setHighlighted({ html, key });
      } catch {
        if (!cancelled) setHighlighted(null);
      }
    }
    void highlight();
    return () => {
      cancelled = true;
    };
  }, [code, dark, key, language, light, highlighted?.key]);

  const codeClass = part('code-block__code', className);

  if (highlighted?.key === key) {
    return (
      <div
        className={codeClass}
        dangerouslySetInnerHTML={{ __html: highlighted.html }}
        data-line-numbers={showLineNumbers || undefined}
        data-slot='code-block-code'
        {...props}
      />
    );
  }

  return (
    <div
      className={codeClass}
      data-line-numbers={showLineNumbers || undefined}
      data-slot='code-block-code'
      {...props}
    >
      <pre>
        <code className='break-all whitespace-pre-wrap'>{code}</code>
      </pre>
    </div>
  );
});

const icon =
  (path: string) =>
  (props: SVGProps<SVGSVGElement>): ReactElement => (
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
        d={path}
        fill='currentColor'
        fillRule='evenodd'
      />
    </svg>
  );
const CopyIcon = icon(
  'M12 2.5H8A1.5 1.5 0 0 0 6.5 4v1H8a3 3 0 0 1 3 3v1.5h1A1.5 1.5 0 0 0 13.5 8V4A1.5 1.5 0 0 0 12 2.5M11 11h1a3 3 0 0 0 3-3V4a3 3 0 0 0-3-3H8a3 3 0 0 0-3 3v1H4a3 3 0 0 0-3 3v4a3 3 0 0 0 3 3h4a3 3 0 0 0 3-3zM4 6.5h4A1.5 1.5 0 0 1 9.5 8v4A1.5 1.5 0 0 1 8 13.5H4A1.5 1.5 0 0 1 2.5 12V8A1.5 1.5 0 0 1 4 6.5',
);
const CheckIcon = icon(
  'M13.488 3.43a.75.75 0 0 1 .081 1.058l-6 7a.75.75 0 0 1-1.1.042l-3.5-3.5A.75.75 0 0 1 4.03 6.97l2.928 2.927 5.473-6.385a.75.75 0 0 1 1.057-.081',
);
const CopyMotionIcon = ({
  copied,
  reduceMotion,
}: {
  copied: boolean;
  reduceMotion: boolean | null;
}): ReactElement => (
  <LazyMotion features={domAnimation}>
    <AnimatePresence initial={false} mode='popLayout'>
      <m.span
        animate={
          reduceMotion
            ? { opacity: 1 }
            : { filter: 'blur(0px)', opacity: 1, scale: 1 }
        }
        className='flex size-3.5 items-center justify-center'
        data-slot='code-block-copy-button-icon-motion'
        exit={
          reduceMotion
            ? { opacity: 0 }
            : { filter: 'blur(4px)', opacity: 0, scale: 0.25 }
        }
        initial={
          reduceMotion
            ? { opacity: 0 }
            : { filter: 'blur(4px)', opacity: 0, scale: 0.25 }
        }
        key={copied ? 'check' : 'copy'}
        transition={
          reduceMotion
            ? { duration: 0.12 }
            : { bounce: 0, duration: 0.3, type: 'spring' }
        }
      >
        {copied ? (
          <CheckIcon className='size-3.5' />
        ) : (
          <CopyIcon className='size-3.5' />
        )}
      </m.span>
    </AnimatePresence>
  </LazyMotion>
);
export interface CodeBlockCopyButtonProps {
  'aria-label'?: string;
  className?: string;
  code: string;
}
export function CodeBlockCopyButton({
  'aria-label': ariaLabel = 'Copy code',
  className,
  code,
}: CodeBlockCopyButtonProps): ReactElement {
  useContext(Context);
  const [copied, setCopied] = useState(false);
  const timeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reduceMotion = useReducedMotion();
  useEffect(
    () => () => {
      if (timeout.current) clearTimeout(timeout.current);
    },
    [],
  );
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      if (timeout.current) clearTimeout(timeout.current);
      timeout.current = setTimeout(() => {
        setCopied(false);
        timeout.current = null;
      }, 2000);
    } catch {
      /* Clipboard permission can be unavailable in embedded previews. */
    }
  };
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
      <CopyMotionIcon copied={copied} reduceMotion={reduceMotion} />
    </Button>
  );
}
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
