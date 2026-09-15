import { AdaptiveCodeBlockCode, AdaptiveCodeBlockCodeProps } from '@aero/ui';
import { useTheme } from '@/app/providers';
import { useAppearanceStore } from '@/app/providers/settings/appearance/appearance-store';

export function CodeBlockContent(props: AdaptiveCodeBlockCodeProps) {
  const { resolvedTheme } = useTheme();

  const colorThemeLight = useAppearanceStore((state) => state.lightTheme);
  const colorThemeDark = useAppearanceStore((state) => state.darkTheme);

  const isDark = resolvedTheme === 'dark';
  const themeName = isDark ? colorThemeDark : colorThemeLight;
  const mode = isDark ? 'dark' : 'light';

  const activeTheme = getShikiTheme(themeName, mode);

  return (
    <AdaptiveCodeBlockCode
      {...props}
      theme={activeTheme}
      darkTheme={activeTheme}
    />
  );
}

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
  if (!themeName) {
    return undefined;
  }

  const entry = SHIKI_THEME_MAP[themeName.toLowerCase()];

  return entry ? entry[mode] : undefined;
}
