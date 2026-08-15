// hooks/use-resolved-theme-sync.ts
import { useEffect } from 'react';

import { useAppearanceStore } from '@/app/providers/settings/appearance/appearance-store';
import { useTheme } from '@/app/providers/theme';

/**
 * Keeps the active color theme in sync with the resolved light/dark mode
 * and the user's chosen light/dark color themes. Lives outside any single
 * leaf component since it reads from both the theme context and the store.
 */
export function useResolvedThemeSync() {
  const { resolvedTheme, colorTheme, setColorTheme } = useTheme();
  const lightTheme = useAppearanceStore((s) => s.lightTheme);
  const darkTheme = useAppearanceStore((s) => s.darkTheme);

  useEffect(() => {
    const targetTheme = resolvedTheme === 'dark' ? darkTheme : lightTheme;
    if (targetTheme && targetTheme !== colorTheme) {
      setColorTheme(targetTheme);
    }
  }, [resolvedTheme, lightTheme, darkTheme, colorTheme, setColorTheme]);
}
