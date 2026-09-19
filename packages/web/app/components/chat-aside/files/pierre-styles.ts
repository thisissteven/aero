import {
  CustomThemeLoader,
  registerCustomTheme,
  resolveTheme,
} from '@pierre/diffs';
import { CSSProperties } from 'react';
import { ColorTheme } from '@/app/providers';

// ── 1. Your existing Shiki theme map ──────────────────────────────
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

// ── 2. The 10 Pierre themes (for fallback) ────────────────────────
const PIERRE_THEMES = new Set<string>([
  'pierre-light',
  'pierre-light-soft',
  'pierre-light-vibrant',
  'pierre-light-protanopia-deuteranopia',
  'pierre-light-tritanopia',
  'pierre-dark',
  'pierre-dark-soft',
  'pierre-dark-vibrant',
  'pierre-dark-protanopia-deuteranopia',
  'pierre-dark-tritanopia',
]);

// ── 3. Static theme loaders ───────────────────────────────────────
// Vite requires static import paths so it can pre-bundle the modules.
// A variable like `import(`@shikijs/themes/${name}`)` is left as-is at
// runtime and fails with "Failed to resolve module specifier".
const THEME_LOADERS: Record<string, CustomThemeLoader> = {
  'github-light': () => import('@shikijs/themes/github-light'),
  'github-dark': () => import('@shikijs/themes/github-dark'),
  'ayu-light': () => import('@shikijs/themes/ayu-light'),
  'ayu-dark': () => import('@shikijs/themes/ayu-dark'),
  'catppuccin-latte': () => import('@shikijs/themes/catppuccin-latte'),
  'catppuccin-mocha': () => import('@shikijs/themes/catppuccin-mocha'),
  dracula: () => import('@shikijs/themes/dracula'),
  'gruvbox-light-hard': () => import('@shikijs/themes/gruvbox-light-hard'),
  'gruvbox-dark-hard': () => import('@shikijs/themes/gruvbox-dark-hard'),
  'kanagawa-lotus': () => import('@shikijs/themes/kanagawa-lotus'),
  monokai: () => import('@shikijs/themes/monokai'),
  'night-owl': () => import('@shikijs/themes/night-owl'),
  nord: () => import('@shikijs/themes/nord'),
  'rose-pine-dawn': () => import('@shikijs/themes/rose-pine-dawn'),
  'rose-pine': () => import('@shikijs/themes/rose-pine'),
  'solarized-light': () => import('@shikijs/themes/solarized-light'),
  'solarized-dark': () => import('@shikijs/themes/solarized-dark'),
  'tokyo-night': () => import('@shikijs/themes/tokyo-night'),
  'vitesse-light': () => import('@shikijs/themes/vitesse-light'),
  'vitesse-dark': () => import('@shikijs/themes/vitesse-dark'),
};

let isRegistered = false;

export function registerPierreThemes() {
  if (isRegistered) return;

  const allThemeNames = new Set<string>();
  for (const entry of Object.values(PIERRE_THEME_MAP)) {
    if (!entry) continue;
    if (typeof entry === 'string') {
      allThemeNames.add(entry);
    } else {
      allThemeNames.add(entry.light);
      allThemeNames.add(entry.dark);
    }
  }

  for (const name of allThemeNames) {
    const loader = THEME_LOADERS[name];
    if (!loader) {
      // No loader registered for this name (e.g. aura, carbonfox,
      // vercel-*, tokyo-night-storm, zenburn, shades-of-purple).
      // Skip silently — getPierreTheme falls back to Pierre defaults.
      continue;
    }

    registerCustomTheme(name, loader);
    void resolveTheme(name);
  }

  isRegistered = true;
}

// ── 4. Resolver with fallback ──────────────────────────────────────
type PierreThemeValue = { dark: string; light: string };

const PIERRE_FALLBACK: PierreThemeValue = {
  dark: 'pierre-dark',
  light: 'pierre-light',
};

export function getPierreTheme(
  colorTheme: ColorTheme,
  resolvedTheme: 'light' | 'dark',
): PierreThemeValue {
  const mapped = PIERRE_THEME_MAP[colorTheme];
  if (!mapped) {
    return PIERRE_FALLBACK;
  }

  // String case: return immediately so TS narrows `mapped` below.
  if (typeof mapped === 'string') {
    if (!PIERRE_THEMES.has(mapped) && !THEME_LOADERS[mapped]) {
      return PIERRE_FALLBACK;
    }
    return { dark: mapped, light: mapped };
  }

  // Here `mapped` is narrowed to { light: string; dark: string }.
  const candidate = resolvedTheme === 'dark' ? mapped.dark : mapped.light;
  if (
    !candidate ||
    (!PIERRE_THEMES.has(candidate) && !THEME_LOADERS[candidate])
  ) {
    return PIERRE_FALLBACK;
  }

  return { dark: mapped.dark, light: mapped.light };
}

// ── 5. Everything below stays exactly the same ──────────────────────

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
