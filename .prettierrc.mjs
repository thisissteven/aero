export default {
  arrowParens: 'always',
  singleQuote: true,
  jsxSingleQuote: true,
  tabWidth: 2,
  semi: true,
  plugins: ['prettier-plugin-tailwindcss'],
  overrides: [
    {
      files: '*.code-workspace',
      options: {
        trailingComma: 'none',
      },
    },
  ],
};
