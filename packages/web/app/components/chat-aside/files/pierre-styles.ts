import type { CSSProperties } from 'react';
import type { ColorTheme } from '@/app/providers';

// ── Bundled Shiki themes shipped with @pierre/diffs ───────────────
// These are resolvable by name at any time — no registration step.
type BundledTheme =
  | 'andromeeda'
  | 'aurora-x'
  | 'ayu-dark'
  | 'ayu-light'
  | 'ayu-mirage'
  | 'catppuccin-frappe'
  | 'catppuccin-latte'
  | 'catppuccin-macchiato'
  | 'catppuccin-mocha'
  | 'dark-plus'
  | 'dracula'
  | 'dracula-soft'
  | 'everforest-dark'
  | 'everforest-light'
  | 'github-dark'
  | 'github-dark-default'
  | 'github-dark-dimmed'
  | 'github-dark-high-contrast'
  | 'github-light'
  | 'github-light-default'
  | 'github-light-high-contrast'
  | 'gruvbox-dark-hard'
  | 'gruvbox-dark-medium'
  | 'gruvbox-dark-soft'
  | 'gruvbox-light-hard'
  | 'gruvbox-light-medium'
  | 'gruvbox-light-soft'
  | 'horizon'
  | 'horizon-bright'
  | 'houston'
  | 'kanagawa-dragon'
  | 'kanagawa-lotus'
  | 'kanagawa-wave'
  | 'laserwave'
  | 'light-plus'
  | 'material-theme'
  | 'material-theme-darker'
  | 'material-theme-lighter'
  | 'material-theme-ocean'
  | 'material-theme-palenight'
  | 'min-dark'
  | 'min-light'
  | 'monokai'
  | 'night-owl'
  | 'night-owl-light'
  | 'nord'
  | 'one-dark-pro'
  | 'one-light'
  | 'plastic'
  | 'poimandres'
  | 'red'
  | 'rose-pine'
  | 'rose-pine-dawn'
  | 'rose-pine-moon'
  | 'slack-dark'
  | 'slack-ochin'
  | 'snazzy-light'
  | 'solarized-dark'
  | 'solarized-light'
  | 'synthwave-84'
  | 'tokyo-night'
  | 'vesper'
  | 'vitesse-black'
  | 'vitesse-dark'
  | 'vitesse-light';

// ── ColorTheme → bundled theme names ──────────────────────────────
// Pierre resolves these directly from its own bundle. Every value is a
// real bundled theme, so nothing here can fail at render time.
const PIERRE_THEME_MAP: Partial<
  Record<ColorTheme, { light: BundledTheme; dark: BundledTheme }>
> = {
  aero: { light: 'github-light', dark: 'github-dark' },
  amoled: { light: 'github-light', dark: 'min-dark' },
  aura: { light: 'github-light', dark: 'aurora-x' },
  ayu: { light: 'ayu-light', dark: 'ayu-dark' },
  carbonfox: { light: 'github-light', dark: 'github-dark-default' },
  catppuccin: { light: 'catppuccin-latte', dark: 'catppuccin-mocha' },
  cursor: { light: 'github-light', dark: 'github-dark' },
  dracula: { light: 'github-light', dark: 'dracula' },
  'fields-of-the-shire': { light: 'github-light', dark: 'everforest-dark' },
  flexoki: { light: 'github-light', dark: 'github-dark' },
  github: { light: 'github-light', dark: 'github-dark' },
  gruvbox: { light: 'gruvbox-light-hard', dark: 'gruvbox-dark-hard' },
  jetbrains: { light: 'light-plus', dark: 'dark-plus' },
  kanagawa: { light: 'kanagawa-lotus', dark: 'kanagawa-wave' },
  'lucent-orng': { light: 'github-light', dark: 'github-dark' },
  mono: { light: 'min-light', dark: 'min-dark' },
  'mono-plus': { light: 'min-light', dark: 'min-dark' },
  monokai: { light: 'github-light', dark: 'monokai' },
  nightowl: { light: 'night-owl-light', dark: 'night-owl' },
  nord: { light: 'github-light', dark: 'nord' },
  'oc-2': { light: 'github-light', dark: 'github-dark' },
  onedarkpro: { light: 'one-light', dark: 'one-dark-pro' },
  orng: { light: 'github-light', dark: 'github-dark' },
  rosepine: { light: 'rose-pine-dawn', dark: 'rose-pine' },
  shadesofpurple: { light: 'github-light', dark: 'synthwave-84' },
  solarized: { light: 'solarized-light', dark: 'solarized-dark' },
  tokyonight: { light: 'github-light', dark: 'tokyo-night' },
  vercel: { light: 'github-light', dark: 'github-dark' },
  vesper: { light: 'github-light', dark: 'vesper' },
  vitesse: { light: 'vitesse-light', dark: 'vitesse-dark' },
  zenburn: { light: 'github-light', dark: 'github-dark' },
};

const PIERRE_FALLBACK: { light: BundledTheme; dark: BundledTheme } = {
  light: 'github-light',
  dark: 'github-dark',
};

/**
 * Resolves a `ColorTheme` to two bundled Shiki theme names. Pierre
 * resolves them from its own bundle — no registration, no loading,
 * no async. The returned strings are always valid.
 */
export function getPierreTheme(colorTheme: ColorTheme): {
  light: BundledTheme;
  dark: BundledTheme;
} {
  return PIERRE_THEME_MAP[colorTheme] ?? PIERRE_FALLBACK;
}

// ── Shadow-root CSS (unchanged) ───────────────────────────────────

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
