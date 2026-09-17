import { CSSProperties } from 'react';
import { ColorTheme } from '@/app/providers';

const PIERRE_THEME_MAP: Partial<
  Record<ColorTheme, string | { light: string; dark: string }>
> = {
  aero: { light: 'github-light', dark: 'github-dark' },
  amoled: { light: 'github-light', dark: 'github-dark' },
  aura: 'aura',
  ayu: { light: 'ayu-light', dark: 'ayu-dark' },
  carbonfox: 'carbonfox',
  catppuccin: { light: 'catppuccin-latte', dark: 'catppuccin-mocha' },
  cursor: { light: 'github-light', dark: 'github-dark' },
  dracula: 'dracula',
  flexoki: { light: 'flexoki-light', dark: 'flexoki-dark' },
  github: { light: 'github-light', dark: 'github-dark' },
  gruvbox: { light: 'gruvbox-light-hard', dark: 'gruvbox-dark-hard' },
  kanagawa: 'kanagawa-lotus',
  monokai: 'monokai',
  nightowl: 'night-owl',
  nord: 'nord',
  rosepine: { light: 'rose-pine-dawn', dark: 'rose-pine' },
  shadesofpurple: 'shades-of-purple',
  solarized: { light: 'solarized-light', dark: 'solarized-dark' },
  tokyonight: { light: 'tokyo-night', dark: 'tokyo-night-storm' },
  vercel: { light: 'vercel-light', dark: 'vercel-dark' },
  vesper: 'vesper',
  vitesse: { light: 'vitesse-light', dark: 'vitesse-dark' },
  zenburn: 'zenburn',
};

type PierreThemeValue = { dark: string; light: string };

export function getPierreTheme(
  colorTheme: ColorTheme,
  resolvedTheme: 'light' | 'dark',
): PierreThemeValue {
  const mapped = PIERRE_THEME_MAP[colorTheme];
  if (!mapped) {
    return { dark: 'pierre-dark', light: 'pierre-light' };
  }
  if (typeof mapped === 'string') {
    return { dark: mapped, light: mapped };
  }
  return { dark: mapped.dark, light: mapped.light };
}

export function getPierreShadowCss(fontSize: number): string {
  return `
:host {
  --diffs-dark-bg: transparent !important;
  --diffs-light-bg: transparent !important;
  --diffs-font-family: var(--font-mono, ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace);
  --diffs-font-size: ${fontSize}px;
  --diffs-line-height: 1.65;
}

[data-gutter],
[data-column-number] {
  background-color: color-mix(in oklab, var(--surface) 30%, transparent) !important;
  backdrop-filter: blur(4px) !important;
  -webkit-backdrop-filter: blur(4px) !important;
}

pre {
  padding-top: 4px !important;
  padding-bottom: 4px !important;
}

[data-code] {
  padding-top: 0 !important;
  padding-bottom: 0 !important;
}

[data-gutter-buffer] {
  opacity: 0.4 !important;
}

* {
  scrollbar-width: thin;
  scrollbar-color: color-mix(in oklab, currentColor 15%, transparent) transparent;
}

*::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}

*::-webkit-scrollbar-track {
  background: transparent;
}

*::-webkit-scrollbar-thumb {
  background-color: color-mix(in oklab, currentColor 15%, transparent);
  border-radius: 9999px;
}

*::-webkit-scrollbar-thumb:hover {
  background-color: color-mix(in oklab, currentColor 30%, transparent);
}
`;
}

export const PIERRE_FILE_STYLE: CSSProperties = {
  flex: '1 1 auto',
  minWidth: '100%',
  minHeight: '100%',
  background: 'transparent',
};
