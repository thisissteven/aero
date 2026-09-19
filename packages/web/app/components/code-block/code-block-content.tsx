'use client';

import { ComponentPropsWithRef, useMemo } from 'react';
import { getPierreTheme } from '@/app/components/chat-aside/files/pierre-styles';
import { useTheme } from '@/app/providers';
import { CodeBlock } from './code-block';

export interface CodeBlockCodeProps extends ComponentPropsWithRef<'div'> {
  code: string;
  darkTheme?: string;
  highlightedHtml?: string;
  language?: string;
  showLineNumbers?: boolean;
  theme?: string;
  scrollOverflow?: boolean;
  variant?: 'diff' | 'file';
  patch?: string;
}

export function CodeBlockContent(props: CodeBlockCodeProps) {
  const { resolvedTheme, colorTheme } = useTheme();

  const pierreTheme = useMemo(() => getPierreTheme(colorTheme), [colorTheme]);

  return (
    <CodeBlock.Code
      {...props}
      theme={pierreTheme.light}
      darkTheme={pierreTheme.dark}
      // Pierre does NOT infer which side of the pair to use. Without
      // this, light mode renders the dark palette.
      themeType={resolvedTheme}
    />
  );
}
