/* oxlint-disable react/no-danger -- Shiki escapes source; we're just re-splitting its own trusted output per line. */
'use client';

import { cn, ScrollShadow } from '@heroui/react';
import type { ComponentPropsWithRef, ReactElement } from 'react';
import { memo, useEffect, useMemo, useRef, useState } from 'react';
import { Virtualizer } from 'virtua';

import { highlightCode } from './code-block';

const part = (base: string, className: unknown): string =>
  cn(base, typeof className === 'string' ? className : undefined) ?? base;

function fastHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return hash.toString(36);
}

function parseStyleAttribute(style: string): Record<string, string> {
  const result: Record<string, string> = {};
  for (const decl of style.split(';')) {
    const idx = decl.indexOf(':');
    if (idx === -1) continue;
    const rawKey = decl.slice(0, idx).trim();
    const value = decl.slice(idx + 1).trim();
    if (!rawKey || !value) continue;
    // Custom properties (--shiki-dark-bg) keep their literal name; only
    // camelCase the standard kebab-case CSS properties Shiki also writes.
    const key = rawKey.startsWith('--')
      ? rawKey
      : rawKey.replace(/-([a-z])/g, (_, c: string) => c.toUpperCase());
    result[key] = value;
  }
  return result;
}

interface ParsedHighlight {
  preClassName?: string;
  preStyle?: Record<string, string>;
  lines: string[];
}

function parseHighlightedHtml(html: string): ParsedHighlight {
  const root = document.createElement('div');
  root.innerHTML = html;

  const pre = root.querySelector('pre');
  const lineEls = root.querySelectorAll('code > .line');

  return {
    preClassName: pre?.getAttribute('class') ?? undefined,
    preStyle: pre?.getAttribute('style')
      ? parseStyleAttribute(pre.getAttribute('style')!)
      : undefined,
    lines: Array.from(lineEls, (el) => el.outerHTML),
  };
}

export interface VirtualizedCodeBlockCodeProps extends Omit<
  ComponentPropsWithRef<'div'>,
  'children'
> {
  code: string;
  darkTheme?: string;
  /** Row height hint forwarded to virtua for first-paint offset estimation */
  itemSize?: number;
  language?: string;
  scrollOverflow?: boolean;
  showLineNumbers?: boolean;
  theme?: string;
}

export const VirtualizedCodeBlockCode = memo(function VirtualizedCodeBlockCode({
  className,
  code,
  darkTheme = 'github-dark',
  itemSize = 24,
  language = 'plaintext',
  scrollOverflow = false,
  showLineNumbers = false,
  theme = 'github-light',
  ...props
}: VirtualizedCodeBlockCodeProps): ReactElement {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [parsed, setParsed] = useState<ParsedHighlight | null>(null);

  useEffect(() => {
    let cancelled = false;

    highlightCode(code, { darkTheme, language, theme })
      .then((html) => {
        if (!cancelled) setParsed(parseHighlightedHtml(html));
      })
      .catch(() => {
        if (!cancelled) {
          setParsed({
            lines: code
              .split('\n')
              .map((line) => `<span class="line">${line}</span>`),
          });
        }
      });

    return () => {
      cancelled = true;
    };
  }, [code, darkTheme, language, theme]);

  const plainLines = useMemo(() => code.split('\n'), [code]);
  const lines = parsed?.lines ?? plainLines;
  const isHighlighted = parsed !== null;

  return (
    <div
      className={part('code-block__code', className)}
      data-line-numbers={showLineNumbers || undefined}
      data-slot='code-block-code'
      {...props}
    >
      <ScrollShadow
        ref={scrollRef}
        offset={2}
        className={scrollOverflow ? 'code-block__scroll' : undefined}
      >
        <pre
          className={
            isHighlighted
              ? parsed!.preClassName
              : 'p-4 font-mono text-xs leading-relaxed whitespace-pre'
          }
          style={isHighlighted ? parsed!.preStyle : undefined}
        >
          <Virtualizer<string>
            as='div'
            item='div'
            data={lines}
            itemSize={itemSize}
            scrollRef={scrollRef}
          >
            {(line, index) => {
              const rowKey = `${index}-${fastHash(line)}`;
              return showLineNumbers ? (
                <div
                  key={rowKey}
                  className='code-block__line'
                  data-slot='code-block-line'
                >
                  <span className='code-block__line-number' aria-hidden='true'>
                    {index + 1}
                  </span>
                  {isHighlighted ? (
                    <span dangerouslySetInnerHTML={{ __html: line }} />
                  ) : (
                    <span>{line}</span>
                  )}
                </div>
              ) : isHighlighted ? (
                <div key={rowKey} dangerouslySetInnerHTML={{ __html: line }} />
              ) : (
                <div key={rowKey}>{line}</div>
              );
            }}
          </Virtualizer>
        </pre>
      </ScrollShadow>
    </div>
  );
});

VirtualizedCodeBlockCode.displayName = 'VirtualizedCodeBlockCode';
