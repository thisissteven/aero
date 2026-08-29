import { Hono } from 'hono';
import { readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const folderPicker = new Hono();

const MAX_SEARCH_RESULTS = 500;
const MAX_SEARCH_DIRECTORIES = 50_000;

/**
 * GET /roots
 *
 * Returns the filesystem roots available to the server.
 *
 * Windows:
 *   ["C:/", "D:/"]
 *
 * Linux/macOS:
 *   ["/"]
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
        // Ignore unavailable roots.
      }
    }

    return c.json({
      roots: availableRoots,
    });
  } catch (error) {
    console.error('Failed to get filesystem roots:', error);

    return c.json(
      {
        error: 'Failed to get filesystem roots',
      },
      500,
    );
  }
});

/**
 * GET /list?path=C%3A%2FUsers
 *
 * Returns only directories directly inside the requested path.
 */
folderPicker.get('/list', async (c) => {
  const requestedPath = c.req.query('path');

  if (!requestedPath) {
    return c.json(
      {
        error: 'Missing path',
      },
      400,
    );
  }

  const resolvedPath = normalizeFilesystemPath(requestedPath);

  try {
    const directoryEntries = await readdir(resolvedPath, {
      withFileTypes: true,
    });

    const directories = directoryEntries
      .filter((entry) => entry.isDirectory())
      .map((entry) => {
        const childPath = path.join(resolvedPath, entry.name);

        return {
          name: entry.name,
          path: normalizeFilesystemPath(childPath),
        };
      })
      .sort((a, b) =>
        a.name.localeCompare(b.name, undefined, {
          sensitivity: 'base',
        }),
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
      return c.json(
        {
          error: 'Directory does not exist',
        },
        404,
      );
    }

    if (code === 'EACCES' || code === 'EPERM') {
      return c.json(
        {
          error: 'Permission denied',
        },
        403,
      );
    }

    console.error(`Failed to list directory "${resolvedPath}":`, error);

    return c.json(
      {
        error: 'Failed to read directory',
      },
      500,
    );
  }
});

/**
 * GET /search?path=C%3A%2FUsers&query=Downloads
 *
 * Recursively searches for directories whose names contain
 * the query.
 *
 * The search is performed on the server so the frontend
 * doesn't need to download the whole filesystem tree.
 */
folderPicker.get('/search', async (c) => {
  const requestedPath = c.req.query('path');
  const query = c.req.query('query')?.trim();

  if (!requestedPath) {
    return c.json(
      {
        error: 'Missing path',
      },
      400,
    );
  }

  if (!query) {
    return c.json(
      {
        error: 'Missing query',
      },
      400,
    );
  }

  if (query.length > 255) {
    return c.json(
      {
        error: 'Search query is too long',
      },
      400,
    );
  }

  const resolvedRoot = normalizeFilesystemPath(requestedPath);

  const results: {
    name: string;
    path: string;
  }[] = [];

  let visitedDirectories = 0;
  let truncated = false;

  const searchQuery = query.toLocaleLowerCase();

  const walk = async (directoryPath: string) => {
    if (
      results.length >= MAX_SEARCH_RESULTS ||
      visitedDirectories >= MAX_SEARCH_DIRECTORIES
    ) {
      truncated = true;
      return;
    }

    let entries;

    try {
      entries = await readdir(directoryPath, {
        withFileTypes: true,
      });
    } catch (error) {
      // Searching across arbitrary filesystem directories
      // will inevitably encounter permission-denied folders.
      //
      // Skip them rather than failing the entire search.
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

      if (!entry.isDirectory()) {
        continue;
      }

      const childPath = normalizeFilesystemPath(
        path.join(directoryPath, entry.name),
      );

      visitedDirectories++;

      if (entry.name.toLocaleLowerCase().includes(searchQuery)) {
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

    return c.json(
      {
        error: 'Failed to search directories',
      },
      500,
    );
  }
});

/**
 * Normalizes paths while preserving Windows drive roots.
 */
function normalizeFilesystemPath(input: string): string {
  const normalized = path.normalize(input);

  if (process.platform === 'win32' && /^[A-Za-z]:\\?$/.test(normalized)) {
    return `${normalized[0].toUpperCase()}:\\`;
  }

  return normalized;
}

/**
 * Gets parent while correctly handling filesystem roots.
 */
function getParentPath(inputPath: string): string | null {
  const normalized = normalizeFilesystemPath(inputPath);

  const parent = path.dirname(normalized);

  if (parent === normalized) {
    return null;
  }

  return normalizeFilesystemPath(parent);
}

/**
 * Returns filesystem roots.
 */
function getFilesystemRoots(): string[] {
  if (process.platform === 'win32') {
    const roots: string[] = [];

    // C:\ through Z:\
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

export default folderPicker;
