import type { CSSProperties } from 'react';
import type { TreeAppChromeStyles, TreeAppTheme } from './tree-app-types';

export const DEFAULT_EXPLORER_WIDTH = 280;
export const DEFAULT_MIN_EXPLORER_WIDTH = 180;
export const DEFAULT_MAX_EXPLORER_WIDTH = 600;
export const DEFAULT_NEW_FILE_NAME = 'untitled';
export const DEFAULT_NEW_FOLDER_NAME = 'untitled';

export const FILE_STYLE: CSSProperties = {
  flex: '1 1 auto',
  minWidth: '100%',
  // Let the parent's surface color show through so the editor area blends
  // with the surrounding chrome instead of painting its own background.
  background: 'transparent',
};

export const CHROME_STYLES: Record<TreeAppTheme, TreeAppChromeStyles> = {
  dark: {
    container: 'bg-[#070707] text-zinc-200',
    tabbarBgVar: '#070707',
    editorBgVar: 'transparent',
    treeSurfaceFallback: '#141415',
    tabActive: 'bg-neutral-900 text-zinc-100',
    tabInactive:
      'bg-transparent text-zinc-400 group-hover/tabbar:bg-neutral-900/30 group-hover/tabbar:hover:bg-neutral-800/60 group-hover/tabbar:hover:text-zinc-200',
    tabCloseGradientFrom: 'from-neutral-900 via-neutral-900',
    tabCloseButton: 'bg-neutral-800 text-neutral-500 hover:text-zinc-100',
    emptyText: 'text-zinc-500',
    headerTitle: 'text-neutral-200',
    headerIconButton: 'text-neutral-400 hover:text-neutral-100',
    headerSearchActive: 'text-neutral-100',
    headerSearchInactive:
      'text-neutral-400 hover:text-neutral-100 group-hover/tree-app-explorer:opacity-100',
    themeToggleButton: 'text-neutral-400 hover:text-neutral-100',
  },
  light: {
    container: 'bg-white text-zinc-900',
    tabbarBgVar: '#ffffff',
    editorBgVar: 'transparent',
    treeSurfaceFallback: '#f8f8f8',
    tabActive: 'bg-zinc-100 text-zinc-900',
    tabInactive:
      'bg-transparent text-zinc-500 group-hover/tabbar:bg-zinc-100/60 group-hover/tabbar:hover:bg-zinc-200/70 group-hover/tabbar:hover:text-zinc-900',
    tabCloseGradientFrom: 'from-zinc-100 via-zinc-100',
    tabCloseButton: 'bg-zinc-200 text-zinc-500 hover:text-zinc-900',
    emptyText: 'text-zinc-500',
    headerTitle: 'text-zinc-900',
    headerIconButton: 'text-zinc-500 hover:text-zinc-900',
    headerSearchActive: 'text-zinc-900',
    headerSearchInactive:
      'text-zinc-500 hover:text-zinc-900 group-hover/tree-app-explorer:opacity-100',
    themeToggleButton: 'text-zinc-500 hover:text-zinc-900',
  },
};
