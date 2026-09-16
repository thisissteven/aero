import type { FileContents, FileOptions } from '@pierre/diffs';
import type {
  ContextMenuItem,
  ContextMenuOpenContext,
  FileTreeIcons,
  FileTree as FileTreeModel,
} from '@pierre/trees';
import type { FileTreePreloadedData } from '@pierre/trees/react';
import type { CSSProperties, ReactNode } from 'react';

export type TreeAppTheme = 'light' | 'dark';

// Callers can opt out of light/dark split by passing a single value, or pass
// a `{ light, dark }` pair to supply distinct payloads for each mode.
type ThemeScoped<T> = { light: T; dark: T };
export type TreeAppThemeValue<T> = T | ThemeScoped<T>;

// Theme-scoped chrome presets used for TreeApp's own wrapping elements.
export interface TreeAppChromeStyles {
  container: string;
  tabbarBgVar: string;
  editorBgVar: string;
  treeSurfaceFallback: string;
  tabActive: string;
  tabInactive: string;
  tabCloseGradientFrom: string;
  tabCloseButton: string;
  emptyText: string;
  headerTitle: string;
  headerIconButton: string;
  headerSearchActive: string;
  headerSearchInactive: string;
  themeToggleButton: string;
}

export interface TreeAppTabRenderContext {
  activate: () => void;
  close: () => void;
  isActive: boolean;
  // True when the tab's buffer differs from the caller-supplied `files` entry.
  isUnsaved: boolean;
  path: string;
}

export interface TreeAppContextMenuActions {
  addFile: () => void;
  addFolder: () => void;
  remove: () => void;
  rename: () => void;
}

export interface TreeAppContextMenuRenderContext {
  actions: TreeAppContextMenuActions;
  context: ContextMenuOpenContext;
  item: ContextMenuItem;
}

export interface TreeAppProjectHeaderActions {
  addFile: () => void;
  addFolder: () => void;
  toggleSearch: () => void;
}

export interface TreeAppProjectHeaderRenderContext {
  actions: TreeAppProjectHeaderActions;
  projectName: string;
  // True when the caller opted into the tree's built-in search (search: true on
  // the model) AND passed `searchEnabled` on TreeApp.
  isSearchEnabled: boolean;
  // Reactive open/closed state for the built-in search input.
  isSearchOpen: boolean;
}

export interface TreeAppProps<LAnnotation = unknown> {
  // Tree side: caller owns the model so they keep full control over
  // composition, search, drag/drop, virtualization, etc. The model must be
  // created with `renaming: true` if rename actions are expected to work, and
  // with `composition.contextMenu.triggerMode` set to control how the menu
  // opens.
  model: FileTreeModel;
  preloadedTreeData?: FileTreePreloadedData;
  // Pass a `{ light, dark }` pair to vary styling alongside the theme toggle.
  treeClassName?: TreeAppThemeValue<string>;
  treeStyle?: TreeAppThemeValue<CSSProperties>;

  // Editor side: files keyed by their tree path.
  files?: Readonly<Record<string, FileContents>>;
  prerenderedHTMLByPath?: TreeAppThemeValue<Readonly<Record<string, string>>>;
  fileOptions?: TreeAppThemeValue<FileOptions<LAnnotation, undefined>>;
  // Fired on Cmd/Ctrl+S after TreeApp clears the tab's unsaved indicator.
  onSave?: (path: string, file: FileContents) => void;

  // Light/dark theming.
  theme?: TreeAppTheme;
  defaultTheme?: TreeAppTheme;
  onThemeChange?: (theme: TreeAppTheme) => void;
  showThemeToggle?: boolean;

  // SSR-friendly initial state.
  initialOpenPaths?: readonly string[];
  initialActivePath?: string | null;

  initialExplorerWidth?: number;
  minExplorerWidth?: number;
  maxExplorerWidth?: number;

  // When provided, the open tab set / active tab persist to sessionStorage and
  // the explorer width persists to localStorage under this key. Omit to keep
  // TreeApp fully ephemeral.
  storageKey?: string;

  height?: number | string;
  className?: string;
  style?: CSSProperties;

  // Project header (sits above the file tree inside the explorer sidebar).
  projectName?: string;
  renderProjectHeader?: (
    context: TreeAppProjectHeaderRenderContext,
  ) => ReactNode;
  // Set to true when the underlying FileTree model was constructed with
  // `search: true`.
  searchEnabled?: boolean;

  // Context menu rendered through the tree's context menu slot.
  renderContextMenu?: (context: TreeAppContextMenuRenderContext) => ReactNode;
  // Where the dropdown content portals to.
  contextMenuPortalContainer?: HTMLElement | null;

  // Placeholder names used for new file/folder mutations.
  newFileTemplateName?: string;
  newFolderTemplateName?: string;

  // Other extension slots.
  renderWindowChrome?: () => ReactNode;
  renderTab?: (context: TreeAppTabRenderContext) => ReactNode;
  showTabs?: boolean;
  renderEmpty?: () => ReactNode;
  tabIcons?: FileTreeIcons;
}

export interface TreeAppResolvedTabIcon {
  height?: number;
  name: string;
  token?: string;
  viewBox?: string;
  width?: number;
}
