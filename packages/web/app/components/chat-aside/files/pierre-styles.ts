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

[data-search-panel],
[data-editor-widget] {
  background: var(--background) !important;
}

[data-input-box] input {
  border: none !important;
  outline: none !important;
  box-shadow: none !important;
  border-radius: var(--radius-sm, 6px) !important;
  background: var(--field-background) !important;
}

/* Strip the parent's background so it doesn't double up */
[data-input-box] {
  background: transparent !important;
  border: none !important;
}

/* ── Search input: no focus ring ──────────────────────────────────── */
[data-input-box],
[data-input-box]:focus,
[data-input-box]:focus-within,
[data-input-box]:focus-visible {
  outline: none !important;
  box-shadow: none !important;
}

[data-input-box] input,
[data-input-box] input:focus,
[data-input-box] input:focus-visible {
  outline: none !important;
  box-shadow: none !important;
  border: none !important;
}

/* If Pierre paints its ring with an ::after/::before pseudo, kill that too */
[data-input-box]::after,
[data-input-box]::before {
  display: none !important;
}

/* ── Close + nav buttons: force color all the way down to the SVG ── */
[data-search-panel] button[data-search-icon],
[data-search-panel] [data-search-close],
[data-search-panel] [data-search-nav] button {
  color: var(--muted) !important;
  background: transparent !important;
}

[data-search-panel] button[data-search-icon]:hover:not(:disabled),
[data-search-panel] [data-search-close]:hover,
[data-search-panel] [data-search-nav] button:hover:not(:disabled) {
  color: var(--foreground) !important;
  background: var(--surface-hover) !important;
}

/* The icon itself. Setting color on the button doesn't reach an SVG that
   uses fill="#…" or a hardcoded stroke. currentColor forces it to inherit. */
[data-search-panel] button[data-search-icon] svg,
[data-search-panel] [data-search-close] svg,
[data-search-panel] [data-search-nav] button svg {
  color: inherit !important;
  fill: currentColor !important;
  stroke: currentColor !important;
}

/* Disabled prev/next — dim, don't recolor */
[data-search-panel] [data-search-nav] button:disabled {
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
