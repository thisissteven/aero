import { FileTree, useFileTreeSelection } from '@pierre/trees/react';
import { useEffect } from 'react';

import { UseLazyFileTreeResult } from '@/app/components/chat-aside/files/use-lazy-file-tree';
import { ColorTheme, useTheme } from '@/app/providers';

export interface FileExplorerProps extends UseLazyFileTreeResult {
  onOpenFile: (path: string) => void;
  className?: string;
}

const TREE_THEME_MAP: Partial<Record<ColorTheme, string>> = {
  github: 'github-dark',
  dracula: 'dracula',
  catppuccin: 'catppuccin-mocha',
  gruvbox: 'gruvbox-dark-hard',
  nord: 'nord',
  monokai: 'monokai',
  nightowl: 'night-owl',
  rosepine: 'rose-pine',
  solarized: 'solarized-dark',
  tokyonight: 'tokyo-night',
  vesper: 'vesper',
  vitesse: 'vitesse-dark',
  zenburn: 'zenburn',
  aero: 'github-dark',
  amoled: 'github-dark',
  aura: 'aura',
  ayu: 'ayu-dark',
  carbonfox: 'carbonfox',
  cursor: 'github-dark',
  flexoki: 'flexoki-dark',
  jetbrains: 'github-dark',
  'lucent-orng': 'github-dark',
  mono: 'github-dark',
  'mono-plus': 'github-dark',
  'oc-2': 'github-dark',
  onedarkpro: 'github-dark',
  orng: 'github-dark',
  shadesofpurple: 'shades-of-purple',
  vercel: 'vercel-dark',
  'fields-of-the-shire': 'github-dark',
};

const TREE_LIGHT_THEME_MAP: Partial<Record<ColorTheme, string>> = {
  github: 'github-light',
  catppuccin: 'catppuccin-latte',
  gruvbox: 'gruvbox-light-hard',
  rosepine: 'rose-pine-dawn',
  solarized: 'solarized-light',
  tokyonight: 'tokyo-night',
  vitesse: 'vitesse-light',
  vercel: 'vercel-light',
  flexoki: 'flexoki-light',
  ayu: 'ayu-light',
  aero: 'github-light',
  cursor: 'github-light',
  amoled: 'github-light',
  jetbrains: 'github-light',
  'lucent-orng': 'github-light',
  mono: 'github-light',
  'mono-plus': 'github-light',
  'oc-2': 'github-light',
  onedarkpro: 'github-light',
  orng: 'github-light',
  shadesofpurple: 'shades-of-purple',
};

function getTreeThemeName(
  colorTheme: ColorTheme,
  resolvedTheme: 'light' | 'dark',
): string {
  const map = resolvedTheme === 'light' ? TREE_LIGHT_THEME_MAP : TREE_THEME_MAP;

  return (
    map[colorTheme] ??
    (resolvedTheme === 'light' ? 'github-light' : 'github-dark')
  );
}

export function FileExplorer({
  model,
  onOpenFile,
  className,
}: FileExplorerProps) {
  const selectedPaths = useFileTreeSelection(model);

  const { resolvedTheme, colorTheme } = useTheme();

  const treeTheme = getTreeThemeName(colorTheme, resolvedTheme);

  useEffect(() => {
    if (selectedPaths.length !== 1) return;

    const path = selectedPaths[0];
    const item = model.getItem(path);

    if (item && !item.isDirectory()) {
      const cleanPath = path.replace(/\/$/, '');
      onOpenFile(cleanPath);
    }
  }, [selectedPaths, model, onOpenFile]);

  return (
    <div className={className}>
      <FileTree
        key={`${resolvedTheme}:${colorTheme}:${treeTheme}`}
        model={model}
        className='h-full rounded-lg border'
        style={{
          height: '100%',
        }}
      />
    </div>
  );
}
