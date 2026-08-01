import type { StorybookConfig } from '@storybook/react-vite';
import { readFileSync as fsReadFileSync } from 'fs';
import { sync as globSync } from 'glob';
import { createRequire } from 'module';
import { dirname, join as pathJoin } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);
const reactScanDist = pathJoin(
  dirname(require.resolve('react-scan/package.json')),
  'dist',
);

export const getStories = () => {
  const __STORYBOOK_READY_ONLY__ = process.env.STORYBOOK_READY_ONLY === 'true';

  if (!__STORYBOOK_READY_ONLY__)
    return ['../src/components/**/*.stories.@(ts|tsx)'];

  const absoluteGlobForSearching = pathJoin(
    __dirname,
    '../src/components/**/*.stories.@(ts|tsx)',
  ).replace(/\\/g, '/');

  const readyStories = globSync(absoluteGlobForSearching).filter(
    (file: string) => {
      const content = fsReadFileSync(file, 'utf-8');
      return /title:\s*["']Components/.test(content);
    },
  );

  return readyStories;
};

const config: StorybookConfig = {
  addons: ['@storybook/addon-a11y', '@storybook/addon-docs'],
  core: {
    disableTelemetry: true,
    disableWhatsNewNotifications: true,
    enableCrashReports: false,
  },
  framework: {
    name: '@storybook/react-vite',
    options: {},
  },
  staticDirs: [
    pathJoin(__dirname, '../public'),
    {
      from: reactScanDist,
      to: '/react-scan',
    },
  ],
  stories: [
    './welcome.mdx',
    './stories/colors.stories.tsx',
    './stories/colors-demo.stories.tsx',
    './stories/demo.stories.tsx',
    ...getStories(),
  ],
};

export default config;
