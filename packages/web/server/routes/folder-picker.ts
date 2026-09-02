import { Hono } from 'hono';
import { mkdir, readdir, realpath, stat } from 'node:fs/promises';
import path from 'node:path';

const folderPicker = new Hono();

const MAX_SEARCH_RESULTS = 500;
const MAX_SEARCH_DIRECTORIES = 10_000;

async function checkIsFolder(
  dirPath: string,
  entryName: string,
  isDirectory: boolean,
  isSymlink: boolean,
): Promise<boolean> {
  if (isDirectory) return true;
  if (isSymlink) {
    try {
      const targetPath = path.join(dirPath, entryName);
      const targetStat = await stat(targetPath);
      return targetStat.isDirectory();
    } catch {
      return false;
    }
  }
  return false;
}

function normalizeFilesystemPath(input: string): string {
  const normalized = path.normalize(input);

  if (process.platform === 'win32') {
    if (/^[A-Za-z]:\\?$/.test(normalized)) {
      return `${normalized[0].toUpperCase()}:\\`;
    }
  }

  return normalized;
}

function getParentPath(inputPath: string): string | null {
  const normalized = normalizeFilesystemPath(inputPath);
  const parent = path.dirname(normalized);

  if (parent === normalized) {
    return null;
  }

  return normalizeFilesystemPath(parent);
}

function getFilesystemRoots(): string[] {
  if (process.platform === 'win32') {
    const roots: string[] = [];
    for (
      let letter = 'C'.charCodeAt(0);
      letter <= 'Z'.charCodeAt(0);
      letter++
    ) {
      roots.push(`${String.fromCharCode(letter)}:\\`);
    }
    return roots;
  }

  return ['/'];
}

function getFsErrorCode(error: unknown): string | undefined {
  if (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof error.code === 'string'
  ) {
    return error.code;
  }
  return undefined;
}

/**
 * GET /roots
 */
folderPicker.get('/roots', async (c) => {
  try {
    const roots = getFilesystemRoots();
    const availableRoots: string[] = [];

    for (const root of roots) {
      try {
        await stat(root);
        availableRoots.push(root);
      } catch {
        // Ignore unavailable roots
      }
    }

    return c.json({ roots: availableRoots });
  } catch (error) {
    console.error('Failed to get filesystem roots:', error);
    return c.json({ error: 'Failed to get filesystem roots' }, 500);
  }
});

/**
 * GET /list?path=C%3A%2FUsers&showHidden=true
 */
folderPicker.get('/list', async (c) => {
  const requestedPath = c.req.query('path');
  const showHidden = c.req.query('showHidden') === 'true';

  if (!requestedPath) {
    return c.json({ error: 'Missing path' }, 400);
  }

  const resolvedPath = normalizeFilesystemPath(requestedPath);

  try {
    const directoryEntries = await readdir(resolvedPath, {
      withFileTypes: true,
    });

    const folderPromises = directoryEntries.map(async (entry) => {
      // Filter out hidden folders if showHidden is false
      if (!showHidden && entry.name.startsWith('.')) {
        return null;
      }

      const isFolder = await checkIsFolder(
        resolvedPath,
        entry.name,
        entry.isDirectory(),
        entry.isSymbolicLink(),
      );

      if (!isFolder) return null;

      const childPath = path.join(resolvedPath, entry.name);
      return {
        name: entry.name,
        path: normalizeFilesystemPath(childPath),
      };
    });

    const resolvedFolders = await Promise.all(folderPromises);
    const directories = resolvedFolders
      .filter((item): item is { name: string; path: string } => item !== null)
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }),
      );

    const parent = getParentPath(resolvedPath);

    return c.json({
      path: resolvedPath,
      parent,
      directories,
    });
  } catch (error) {
    const code = getFsErrorCode(error);

    if (code === 'ENOENT') {
      return c.json({ error: 'Directory does not exist' }, 404);
    }

    if (code === 'EACCES' || code === 'EPERM') {
      return c.json({ error: 'Permission denied' }, 403);
    }

    console.error(`Failed to list directory "${resolvedPath}":`, error);
    return c.json({ error: 'Failed to read directory' }, 500);
  }
});

/**
 * GET /search?path=C%3A%2FUsers&query=Downloads&showHidden=true
 */
folderPicker.get('/search', async (c) => {
  const requestedPath = c.req.query('path');
  const query = c.req.query('query')?.trim();
  const showHidden = c.req.query('showHidden') === 'true';

  if (!requestedPath) return c.json({ error: 'Missing path' }, 400);
  if (!query) return c.json({ error: 'Missing query' }, 400);
  if (query.length > 255)
    return c.json({ error: 'Search query is too long' }, 400);

  const resolvedRoot = normalizeFilesystemPath(requestedPath);
  const results: { name: string; path: string }[] = [];
  const visitedRealPaths = new Set<string>();

  let visitedDirectories = 0;
  let truncated = false;

  const searchQuery = query.toLowerCase();

  const walk = async (directoryPath: string) => {
    if (
      results.length >= MAX_SEARCH_RESULTS ||
      visitedDirectories >= MAX_SEARCH_DIRECTORIES
    ) {
      truncated = true;
      return;
    }

    try {
      const realDirPath = await realpath(directoryPath);
      if (visitedRealPaths.has(realDirPath)) return;
      visitedRealPaths.add(realDirPath);
    } catch {
      return;
    }

    visitedDirectories++;

    let entries;
    try {
      entries = await readdir(directoryPath, { withFileTypes: true });
    } catch (error) {
      const code = getFsErrorCode(error);
      if (code === 'EACCES' || code === 'EPERM' || code === 'ENOENT') {
        return;
      }
      throw error;
    }

    for (const entry of entries) {
      if (
        results.length >= MAX_SEARCH_RESULTS ||
        visitedDirectories >= MAX_SEARCH_DIRECTORIES
      ) {
        truncated = true;
        return;
      }

      if (!showHidden && entry.name.startsWith('.')) {
        continue;
      }

      const isFolder = await checkIsFolder(
        directoryPath,
        entry.name,
        entry.isDirectory(),
        entry.isSymbolicLink(),
      );

      if (!isFolder) continue;

      const childPath = normalizeFilesystemPath(
        path.join(directoryPath, entry.name),
      );

      if (entry.name.toLowerCase().includes(searchQuery)) {
        results.push({
          name: entry.name,
          path: childPath,
        });
      }

      await walk(childPath);
    }
  };

  try {
    await walk(resolvedRoot);
    return c.json({
      root: resolvedRoot,
      query,
      results,
      truncated,
    });
  } catch (error) {
    console.error(`Failed to search directory "${resolvedRoot}":`, error);
    return c.json({ error: 'Failed to search directories' }, 500);
  }
});

/**
 * POST /create
 * Body: { parentPath: string, name: string }
 */
folderPicker.post('/create', async (c) => {
  try {
    const body = await c.req.json<{ parentPath?: string; name?: string }>();
    const { parentPath, name } = body || {};

    if (!parentPath || typeof parentPath !== 'string') {
      return c.json({ error: 'Missing or invalid parentPath' }, 400);
    }

    if (!name || typeof name !== 'string' || !name.trim()) {
      return c.json({ error: 'Missing or invalid folder name' }, 400);
    }

    const trimmedName = name.trim();

    if (trimmedName.includes('/') || trimmedName.includes('\\')) {
      return c.json(
        { error: 'Folder name cannot contain path separators' },
        400,
      );
    }

    const resolvedParent = normalizeFilesystemPath(parentPath);
    const targetPath = normalizeFilesystemPath(
      path.join(resolvedParent, trimmedName),
    );

    await mkdir(targetPath, { recursive: false });

    return c.json({
      success: true,
      name: trimmedName,
      path: targetPath,
    });
  } catch (error) {
    const code = getFsErrorCode(error);

    if (code === 'EEXIST') {
      return c.json({ error: 'A folder with that name already exists' }, 409);
    }

    if (code === 'ENOENT') {
      return c.json({ error: 'Parent directory does not exist' }, 404);
    }

    if (code === 'EACCES' || code === 'EPERM') {
      return c.json({ error: 'Permission denied' }, 403);
    }

    console.error(`Failed to create folder:`, error);
    return c.json({ error: 'Failed to create folder' }, 500);
  }
});

export default folderPicker;
