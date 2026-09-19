'use client';

import { ComponentPropsWithRef } from 'react';
import { getShikiTheme } from '@/app/components/code-block/get-shiki-theme';
import { useTheme } from '@/app/providers';
import { useAppearanceStore } from '@/app/providers/settings/appearance/appearance-store';
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
  const { resolvedTheme } = useTheme();

  const colorThemeLight = useAppearanceStore((state) => state.lightTheme);
  const colorThemeDark = useAppearanceStore((state) => state.darkTheme);

  const isDark = resolvedTheme === 'dark';

  return (
    <CodeBlock.Code
      {...props}
      theme={getShikiTheme(colorThemeLight, 'light')}
      darkTheme={getShikiTheme(colorThemeDark, 'dark')}
      // Pierre does NOT infer which theme to use from the `theme` object.
      // Without this, light mode renders with the wrong token palette.
      themeType={isDark ? 'dark' : 'light'}
    />
  );
}
