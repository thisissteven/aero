import { DocsContainer as StorybookDocsContainer } from '@storybook/addon-docs/blocks';
import type { ComponentProps } from 'react';
import { useEffect, useMemo, useState } from 'react';
import { addons } from 'storybook/preview-api';

import {
  DEFAULT_THEME,
  ensureThemeKey,
  THEME_EVENT_NAME,
  THEME_GLOBAL_TYPE_ID,
} from '../addons/theme/constants';
import { themes } from '../styles/theme';

type DocsContainerProps = ComponentProps<typeof StorybookDocsContainer>;

type DocsContextWithGlobals = DocsContainerProps['context'] & {
  globals?: Record<string, unknown>;
};

/**
 * Synchronize the documentation theme with the toolbar theme, matching HeroUI's
 * Storybook configuration.
 */
export const DocsContainer = ({ children, context }: DocsContainerProps) => {
  const docsContext = context as DocsContextWithGlobals;

  const initialTheme = useMemo(
    () =>
      ensureThemeKey(
        (docsContext.globals?.[THEME_GLOBAL_TYPE_ID] as string | undefined) ??
          undefined,
      ),
    [docsContext.globals],
  );

  const [themeKey, setThemeKey] = useState(initialTheme);

  useEffect(() => {
    const nextTheme = ensureThemeKey(
      (docsContext.globals?.[THEME_GLOBAL_TYPE_ID] as string | undefined) ??
        undefined,
    );

    setThemeKey((currentTheme) =>
      currentTheme === nextTheme ? currentTheme : nextTheme,
    );
  }, [docsContext.globals]);

  useEffect(() => {
    const channel = addons.getChannel();

    const handleThemeChange = (event: { theme: string }) => {
      const nextTheme = ensureThemeKey(event.theme);

      setThemeKey((currentTheme) =>
        currentTheme === nextTheme ? currentTheme : nextTheme,
      );
    };

    channel.on(THEME_EVENT_NAME, handleThemeChange);

    return () => channel.off(THEME_EVENT_NAME, handleThemeChange);
  }, []);

  const selectedTheme =
    themes[themeKey as keyof typeof themes] || themes[DEFAULT_THEME];

  return (
    <StorybookDocsContainer context={context} theme={selectedTheme}>
      {children}
    </StorybookDocsContainer>
  );
};
