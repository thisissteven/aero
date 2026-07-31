import type { StorybookConfig } from '@storybook/react-vite';
import { sync as globSync } from 'glob';
import { existsSync, readFileSync as fsReadFileSync } from 'node:fs';
import { dirname, join as pathJoin } from 'node:path';
import { fileURLToPath } from 'node:url';

const filename = fileURLToPath(import.meta.url);
const storybookConfigDir = dirname(filename);
const componentStoryGlob = pathJoin(
  storybookConfigDir,
  '../src/components/**/*.stories.@(ts|tsx)',
);
const sharedAssetsDir = pathJoin(
  storybookConfigDir,
  '../../docs/public/assets',
);
const hasAssetCdn = Boolean(process.env.NEXT_PUBLIC_CDN_URL);

export const getStories = () => {
  const isStorybookReadyOnly = process.env.STORYBOOK_READY_ONLY === 'true';

  if (!isStorybookReadyOnly) return [componentStoryGlob];

  const readyStories = globSync(componentStoryGlob).filter((file) => {
    const content = fsReadFileSync(file, 'utf-8');

    return /title:\s*["']Components/.test(content);
  });

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
    pathJoin(storybookConfigDir, '../public'),
    ...(!hasAssetCdn && existsSync(sharedAssetsDir)
      ? [{ from: sharedAssetsDir, to: '/assets' }]
      : []),
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
