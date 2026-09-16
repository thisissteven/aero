'use client';

import { CodeBlockCodeProps } from '@aero/ui';
import { AdaptiveCodeBlockCode } from '@/app/components/tool-call-view/adaptive-code-block';
import { useTheme } from '@/app/providers';
import { useAppearanceStore } from '@/app/providers/settings/appearance/appearance-store';

const SHIKI_THEME_MAP: Record<string, { light: string; dark: string }> = {
  github: { light: 'github-light', dark: 'github-dark' },
  catppuccin: { light: 'catppuccin-latte', dark: 'catppuccin-mocha' },
  gruvbox: { light: 'gruvbox-light-medium', dark: 'gruvbox-dark-medium' },
  kanagawa: { light: 'kanagawa-lotus', dark: 'kanagawa-wave' },
  rosepine: { light: 'rose-pine-dawn', dark: 'rose-pine' },
  solarized: { light: 'solarized-light', dark: 'solarized-dark' },
  vitesse: { light: 'vitesse-light', dark: 'vitesse-dark' },
  ayu: { light: 'ayu-dark', dark: 'ayu-dark' },
  dracula: { light: 'dracula', dark: 'dracula' },
  monokai: { light: 'monokai', dark: 'monokai' },
  nord: { light: 'nord', dark: 'nord' },
  vesper: { light: 'github-light', dark: 'vesper' },
  zenburn: { light: 'zenburn', dark: 'zenburn' },
  nightowl: { light: 'github-light', dark: 'night-owl' },
  onedarkpro: { light: 'github-light', dark: 'one-dark-pro' },
  tokyonight: { light: 'github-light', dark: 'tokyo-night' },
};

function getShikiTheme(
  themeName: string | undefined,
  mode: 'light' | 'dark',
): string | undefined {
  if (!themeName) return undefined;
  const entry = SHIKI_THEME_MAP[themeName.toLowerCase()];
  return entry ? entry[mode] : undefined;
}

export function CodeBlockContent(props: CodeBlockCodeProps) {
  const { resolvedTheme } = useTheme();

  const colorThemeLight = useAppearanceStore((state) => state.lightTheme);
  const colorThemeDark = useAppearanceStore((state) => state.darkTheme);

  const isDark = resolvedTheme === 'dark';

  return (
    <AdaptiveCodeBlockCode
      {...props}
      theme={getShikiTheme(colorThemeLight, 'light')}
      darkTheme={getShikiTheme(colorThemeDark, 'dark')}
      // Pierre does NOT infer which theme to use from the `theme` object.
      // Without this, light mode renders with the wrong token palette.
      themeType={isDark ? 'dark' : 'light'}
    />
  );
}
