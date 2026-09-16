import type { FileContents } from '@pierre/diffs';
import type {
  ContextMenuOpenContext,
  FileTreeIcons,
  FileTree as FileTreeModel,
} from '@pierre/trees';
import { getBuiltInSpriteSheet } from '@pierre/trees';
import type { CSSProperties } from 'react';
import type { TreeAppTheme, TreeAppThemeValue } from './tree-app-types';

export function isThemeScoped<T>(value: unknown): value is {
  light: T;
  dark: T;
} {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    'light' in (value as Record<string, unknown>) &&
    'dark' in (value as Record<string, unknown>)
  );
}

export function pickByTheme<T>(
  value: TreeAppThemeValue<T> | undefined,
  theme: TreeAppTheme,
): T | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (isThemeScoped<T>(value)) {
    return value[theme];
  }
  return value;
}

// Returns the trailing path segment used as a tab label.
export function basename(path: string): string {
  const trimmed = path.endsWith('/') ? path.slice(0, -1) : path;
  const lastSlash = trimmed.lastIndexOf('/');
  return lastSlash < 0 ? trimmed : trimmed.slice(lastSlash + 1);
}

// Returns the parent directory path for a file or folder path, including the
// trailing slash. Returns the empty string when the path is at the root.
export function getParentPath(path: string): string {
  const normalizedPath = path.endsWith('/') ? path.slice(0, -1) : path;
  const lastSlashIndex = normalizedPath.lastIndexOf('/');
  return lastSlashIndex < 0
    ? ''
    : `${normalizedPath.slice(0, lastSlashIndex + 1)}`;
}

// Remaps one path after a tree move so open tabs and path-keyed state keep
// following the same file or directory even when its parent folder changes.
export function remapMovedPath(
  path: string,
  fromPath: string,
  toPath: string,
): string {
  if (path === fromPath) {
    return toPath;
  }

  const descendantPrefix = fromPath.endsWith('/') ? fromPath : `${fromPath}/`;
  if (!path.startsWith(descendantPrefix)) {
    return path;
  }

  const destinationPrefix = toPath.endsWith('/') ? toPath : `${toPath}/`;
  return `${destinationPrefix}${path.slice(descendantPrefix.length)}`;
}

export function remapMovedPaths(
  paths: readonly string[],
  fromPath: string,
  toPath: string,
): readonly string[] {
  const seen = new Set<string>();
  const remapped: string[] = [];
  for (const path of paths) {
    const nextPath = remapMovedPath(path, fromPath, toPath);
    if (seen.has(nextPath)) {
      continue;
    }
    seen.add(nextPath);
    remapped.push(nextPath);
  }
  return remapped;
}

// Remaps path-keyed state after a tree move so it follows renamed files.
export function remapPathMap<T>(
  stateByPath: Map<string, T>,
  fromPath: string,
  toPath: string,
): Map<string, T> {
  let changed = false;
  const next = new Map<string, T>();
  for (const [path, state] of stateByPath) {
    const nextPath = remapMovedPath(path, fromPath, toPath);
    if (nextPath !== path) {
      changed = true;
    }
    next.set(nextPath, state);
  }
  return changed ? next : stateByPath;
}

// Remaps a path set after a tree move so unsaved tabs keep following files.
export function remapPathSet(
  paths: ReadonlySet<string>,
  fromPath: string,
  toPath: string,
): Set<string> {
  let changed = false;
  const next = new Set<string>();
  for (const path of paths) {
    const nextPath = remapMovedPath(path, fromPath, toPath);
    if (nextPath !== path) {
      changed = true;
    }
    next.add(nextPath);
  }
  return changed ? next : (paths as Set<string>);
}

// Remaps the in-memory edited-file overlay after a tree move so dirty buffers
// keep following the same files as the tree paths.
export function remapFileContentsMap(
  filesByPath: Readonly<Record<string, FileContents>>,
  fromPath: string,
  toPath: string,
): Readonly<Record<string, FileContents>> {
  let changed = false;
  const next: Record<string, FileContents> = {};
  for (const [path, file] of Object.entries(filesByPath)) {
    const nextPath = remapMovedPath(path, fromPath, toPath);
    if (nextPath !== path) {
      changed = true;
      next[nextPath] = { ...file, name: basename(nextPath) };
    } else {
      next[path] = file;
    }
  }
  return changed ? next : filesByPath;
}

// Walks an integer suffix until we find a path that does not collide with an
// existing entry.
export function getUniquePath(model: FileTreeModel, basePath: string): string {
  const hasCollision = (candidate: string): boolean => {
    if (model.getItem(candidate) != null) return true;
    const alternate = candidate.endsWith('/')
      ? candidate.slice(0, -1)
      : `${candidate}/`;
    return model.getItem(alternate) != null;
  };

  let suffix = 0;
  let candidate = basePath;
  while (hasCollision(candidate)) {
    suffix += 1;
    if (basePath.endsWith('/')) {
      candidate = `${basePath.slice(0, -1)}-${String(suffix)}/`;
      continue;
    }

    const dotIndex = basePath.lastIndexOf('.');
    const slashIndex = basePath.lastIndexOf('/');
    if (dotIndex > slashIndex) {
      candidate = `${basePath.slice(0, dotIndex)}-${String(suffix)}${basePath.slice(dotIndex)}`;
      continue;
    }

    candidate = `${basePath}-${String(suffix)}`;
  }
  return candidate;
}

// Positions the hidden Radix dropdown trigger so its bottom-left corner sits on
// the file-tree anchor point.
export function getFloatingContextMenuTriggerStyle(
  anchorRect: ContextMenuOpenContext['anchorRect'],
): CSSProperties {
  return {
    border: 0,
    height: 1,
    left: `${String(anchorRect.left)}px`,
    opacity: 0,
    padding: 0,
    pointerEvents: 'none',
    position: 'fixed',
    top: `${String(anchorRect.bottom - 1)}px`,
    width: 1,
  };
}

export function getContextMenuSideOffset(
  anchorRect: ContextMenuOpenContext['anchorRect'],
): number {
  return anchorRect.width === 0 && anchorRect.height === 0 ? 0 : -2;
}

export function hasCustomIconOverrides(icons: FileTreeIcons): boolean {
  return (
    typeof icons !== 'string' &&
    (icons.spriteSheet != null ||
      icons.remap != null ||
      icons.byFileName != null ||
      icons.byFileExtension != null ||
      icons.byFileNameContains != null)
  );
}

// Builds the icon sprite markup the tab strip needs outside the tree shadow
// DOM.
export function getTabIconSpriteMarkup(icons?: FileTreeIcons): string {
  if (icons == null) {
    return getBuiltInSpriteSheet('complete');
  }

  if (typeof icons === 'string') {
    return getBuiltInSpriteSheet(icons);
  }

  const set =
    icons.set ?? (hasCustomIconOverrides(icons) ? 'none' : 'complete');
  const builtInSpriteSheet = set === 'none' ? '' : getBuiltInSpriteSheet(set);
  const customSpriteSheet = icons.spriteSheet?.trim() ?? '';
  return `${builtInSpriteSheet}${customSpriteSheet}`;
}

export function areColoredTabIconsEnabled(icons?: FileTreeIcons): boolean {
  if (icons == null || typeof icons === 'string') {
    return true;
  }

  return icons.colored ?? true;
}
