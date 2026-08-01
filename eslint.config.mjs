import js from '@eslint/js';
import prettierConfig from 'eslint-config-prettier';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import simpleImportSort from 'eslint-plugin-simple-import-sort';
import storybook from 'eslint-plugin-storybook';
import unusedImports from 'eslint-plugin-unused-imports';
import globals from 'globals';
import tseslint from 'typescript-eslint';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';

export default tseslint.config(
  // Ignore
  {
    ignores: [
      '**/dist/**',
      '**/.turbo/**',
      '**/node_modules/**',
      '**/storybook-static/**',
    ],
  },

  // Base configs
  js.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,

  // Tests
  {
    files: ['**/__tests__/**/*.{ts,tsx}', '**/*.test.{ts,tsx}'],
    languageOptions: {
      globals: {
        ...globals.vitest,
      },
    },
  },

  {
    files: ['apps/storybook/**/*.{ts,tsx}'],
    plugins: {
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
    },
    rules: {
      'react-refresh/only-export-components': 'warn',
      '@typescript-eslint/no-explicit-any': 'off',
      'jsx-a11y/anchor-is-valid': 'warn',
    },
  },

  // React projects
  {
    files: [
      'packages/ui/**/*.{ts,tsx}',
      'packages/web/src/client/**/*.{ts,tsx}',
      'apps/storybook/**/*.{ts,tsx}',
    ],
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: {
        version: 'detect',
      },
    },
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    rules: {
      ...reactHooks.configs['recommended-latest'].rules,

      'react/no-unescaped-entities': 'off',
      'react/display-name': 'off',

      'react/jsx-curly-brace-presence': [
        'warn',
        {
          props: 'never',
          children: 'never',
        },
      ],
    },
  },

  // Node projects
  {
    files: [
      'packages/cli/**/*.ts',
      'packages/web/src/server/**/*.ts',
      '**/scripts/**/*.{js,mjs,ts}',
      'vite.config.ts',
      '*.config.js',
      '*.config.cjs',
      '*.config.mjs',
    ],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },

  // Import sorting + unused imports
  {
    files: ['**/*.{ts,tsx}'],
    plugins: {
      'simple-import-sort': simpleImportSort,
      'unused-imports': unusedImports,
    },
    rules: {
      '@typescript-eslint/no-empty-object-type': 'off',

      'no-console': 'warn',

      '@typescript-eslint/explicit-module-boundary-types': 'off',

      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': 'off',

      'padding-line-between-statements': [
        'warn',
        {
          blankLine: 'always',
          prev: 'function',
          next: 'function',
        },
      ],

      'unused-imports/no-unused-imports': 'warn',
      'unused-imports/no-unused-vars': [
        'warn',
        {
          vars: 'all',
          varsIgnorePattern: '^_',
          args: 'after-used',
          argsIgnorePattern: '^_',
        },
      ],

      'simple-import-sort/exports': 'warn',
      'simple-import-sort/imports': [
        'warn',
        {
          groups: [
            ['^@?\\w', '^\\u0000'],
            ['^.+\\.s?css$'],
            ['^@aero/'],
            ['^@/lib', '^@/hooks'],
            ['^@/data'],
            ['^@/components', '^@/container'],
            ['^@/store'],
            ['^@/'],
            [
              '^\\./?$',
              '^\\.(?!/?$)',
              '^\\.\\./?$',
              '^\\.\\.(?!/?$)',
              '^\\.\\./\\.\\./?$',
              '^\\.\\./\\.\\.(?!/?$)',
              '^\\.\\./\\.\\./\\.\\./?$',
              '^\\.\\./\\.\\./\\.\\.(?!/?$)',
            ],
            ['^@/types'],
            ['^'],
          ],
        },
      ],
    },
  },

  // UI library exceptions
  {
    files: ['packages/ui/**/*.{ts,tsx}', 'apps/storybook/**/*.{ts,tsx}'],
    rules: {
      'react-hooks/immutability': 'off',
      'react-hooks/refs': 'off',
      'react-hooks/set-state-in-effect': 'off',
      '@typescript-eslint/no-unsafe-function-type': 'off',
      'no-empty': 'off',
    },
  },

  // Storybook
  {
    files: ['**/*.stories.{ts,tsx}'],
    ...storybook.configs['flat/recommended'][0],
  },
);
