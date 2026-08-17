import { createContext, type ReactNode, useEffect, useState } from 'react';

import { useKeyPress } from '@/app/hooks/useKeyPress';
import { useAppearanceStore } from '@/app/providers/settings/appearance/appearance-store';

export type Theme = 'light' | 'dark' | 'system';

export type ColorTheme =
  | 'aero'
  | 'amoled'
  | 'aura'
  | 'ayu'
  | 'carbonfox'
  | 'catppuccin'
  | 'cursor'
  | 'dracula'
  | 'fields-of-the-shire'
  | 'flexoki'
  | 'github'
  | 'gruvbox'
  | 'jetbrains'
  | 'kanagawa'
  | 'lucent-orng'
  | 'mono'
  | 'mono-plus'
  | 'monokai'
  | 'nightowl'
  | 'nord'
  | 'oc-2'
  | 'onedarkpro'
  | 'orng'
  | 'rosepine'
  | 'shadesofpurple'
  | 'solarized'
  | 'tokyonight'
  | 'vesper'
  | 'vitesse'
  | 'zenburn';

interface ThemeContextValue {
  /** Current light/dark/system preference. */
  theme: Theme;

  /** Actual resolved theme after resolving "system". */
  resolvedTheme: 'light' | 'dark';

  /** Current color palette/theme ID. */
  colorTheme: ColorTheme;

  /** Change light/dark/system mode. */
  setTheme: (theme: Theme) => void;

  /** Change the color palette without changing light/dark mode. */
  setColorTheme: (colorTheme: ColorTheme) => void;
}

export const ThemeContext = createContext<ThemeContextValue | undefined>(
  undefined,
);

const STORAGE_KEY = 'theme';
const COLOR_THEME_STORAGE_KEY = 'color-theme';

const DEFAULT_COLOR_THEME: ColorTheme = 'dracula';

function getSystemTheme(): 'light' | 'dark' {
  if (typeof window === 'undefined') {
    return 'light';
  }

  return window.matchMedia('(prefers-color-scheme: dark)').matches
    ? 'dark'
    : 'light';
}

function updateFavicon(resolved: 'light' | 'dark') {
  if (typeof window === 'undefined') {
    return;
  }

  const favicon = document.querySelector<HTMLLinkElement>("link[rel*='icon']");

  if (favicon) {
    favicon.href =
      resolved === 'dark' ? '/favicon-dark.svg' : '/favicon-light.svg';
  }
}

function applyTheme(theme: Theme, colorTheme: ColorTheme): 'light' | 'dark' {
  const root = document.documentElement;

  const resolved = theme === 'system' ? getSystemTheme() : theme;

  // Light / dark mode
  root.classList.toggle('dark', resolved === 'dark');

  // Keep this for compatibility with existing selectors.
  root.dataset.theme = resolved;

  // Color palette
  root.dataset.colorTheme = colorTheme;

  // Favicon
  updateFavicon(resolved);

  return resolved;
}

function applyThemeWithoutTransitions(
  theme: Theme,
  colorTheme: ColorTheme,
): 'light' | 'dark' {
  const root = document.documentElement;

  // Disable transitions across the whole document.
  root.classList.add('disable-transitions');

  // Apply theme updates.
  const resolved = applyTheme(theme, colorTheme);

  // Force DOM reflow to immediately flush style updates.
  void window.getComputedStyle(root).opacity;

  // Re-enable transitions on the next paint cycle.
  requestAnimationFrame(() => {
    root.classList.remove('disable-transitions');
  });

  return resolved;
}

function getStoredTheme(defaultTheme: Theme): Theme {
  if (typeof window === 'undefined') {
    return defaultTheme;
  }

  const stored = localStorage.getItem(STORAGE_KEY);

  if (stored === 'light' || stored === 'dark' || stored === 'system') {
    return stored;
  }

  return defaultTheme;
}

function getStoredColorTheme(defaultColorTheme: ColorTheme): ColorTheme {
  if (typeof window === 'undefined') {
    return defaultColorTheme;
  }

  const stored = localStorage.getItem(COLOR_THEME_STORAGE_KEY);

  if (isColorTheme(stored)) {
    return stored;
  }

  return defaultColorTheme;
}

function isColorTheme(value: string | null): value is ColorTheme {
  return value !== null && COLOR_THEMES.includes(value as ColorTheme);
}

export const COLOR_THEMES: readonly ColorTheme[] = [
  'aero',
  'amoled',
  'aura',
  'ayu',
  'carbonfox',
  'catppuccin',
  'cursor',
  'dracula',
  'fields-of-the-shire',
  'flexoki',
  'github',
  'gruvbox',
  'jetbrains',
  'kanagawa',
  'lucent-orng',
  'mono',
  'mono-plus',
  'monokai',
  'nightowl',
  'nord',
  'oc-2',
  'onedarkpro',
  'orng',
  'rosepine',
  'shadesofpurple',
  'solarized',
  'tokyonight',
  'vesper',
  'vitesse',
  'zenburn',
] as const;

export function ThemeProvider({
  children,
  defaultTheme = 'system',
  defaultColorTheme = DEFAULT_COLOR_THEME,
}: {
  children: ReactNode;
  defaultTheme?: Theme;
  defaultColorTheme?: ColorTheme;
}) {
  const [theme, setThemeState] = useState<Theme>(() =>
    getStoredTheme(defaultTheme),
  );

  const [colorTheme, setColorThemeState] = useState<ColorTheme>(() =>
    getStoredColorTheme(defaultColorTheme),
  );

  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>(() =>
    applyTheme(theme, colorTheme),
  );

  function setTheme(nextTheme: Theme) {
    setThemeState(nextTheme);
    localStorage.setItem(STORAGE_KEY, nextTheme);
  }

  function setColorTheme(nextColorTheme: ColorTheme) {
    setColorThemeState(nextColorTheme);
    localStorage.setItem(COLOR_THEME_STORAGE_KEY, nextColorTheme);
  }

  useEffect(() => {
    const update = () => {
      setResolvedTheme(applyThemeWithoutTransitions(theme, colorTheme));
    };

    update();

    if (theme !== 'system') {
      return;
    }

    const media = window.matchMedia('(prefers-color-scheme: dark)');

    media.addEventListener('change', update);

    return () => {
      media.removeEventListener('change', update);
    };
  }, [theme, colorTheme]);

  useKeyPress(
    '/',
    () => {
      const cycleMap: Record<Theme, Theme> = {
        light: 'dark',
        dark: 'system',
        system: 'light',
      };

      const nextMode = cycleMap[theme] ?? 'light';
      setTheme(nextMode);

      const nextResolved =
        nextMode === 'system'
          ? window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'dark'
            : 'light'
          : nextMode;

      const nextColorTheme =
        nextResolved === 'dark'
          ? useAppearanceStore.getState().darkTheme
          : useAppearanceStore.getState().lightTheme;
      setColorTheme(nextColorTheme);
    },
    {
      ignoreInputs: false,
      modifiers: { mod: true },
    },
  );

  return (
    <ThemeContext.Provider
      value={{
        theme,
        resolvedTheme,
        colorTheme,
        setTheme,
        setColorTheme,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}
