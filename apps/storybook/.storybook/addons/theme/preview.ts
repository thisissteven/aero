import type { Preview } from '@storybook/react';

import {
  DEFAULT_THEME,
  THEME_GLOBAL_TYPE_ID,
  THEME_OPTIONS,
  THEME_VALUES,
} from './constants';

export { THEME_GLOBAL_TYPE_ID };

const themeValues = new Set<string>(THEME_VALUES);

export const themeGlobalType = {
  [THEME_GLOBAL_TYPE_ID]: {
    name: 'Theme',
    description: 'Namespace theme for components',
    defaultValue: DEFAULT_THEME,
    toolbar: {
      icon: 'paintbrush',
      items: THEME_OPTIONS.filter((option) =>
        themeValues.has(option.value),
      ).map((option) => ({
        value: option.value,
        title: option.title,
      })),
      dynamicTitle: true,
    },
  },
} satisfies NonNullable<Preview['globalTypes']>;
