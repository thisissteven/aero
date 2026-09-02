// server/routes/discovery.ts

import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { z } from 'zod';

// Supported icon formats & MIME mappings
const ICON_MIME_TYPES: Record<string, string> = {
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
};

// Target file names prioritized for favicon discovery
const PRIORITY_KEYWORDS = ['favicon', 'apple-touch-icon', 'icon', 'logo'];

/**
 * Calculates a priority score for an icon file.
 * Higher scores mean higher quality/priority.
 */
function getIconPriorityScore(fileName: string, ext: string): number {
  const nameLower = fileName.toLowerCase();
  const nameWithoutExt = path.basename(nameLower, ext);

  // 1. Ultimate Priority: high-res vector favicon.svg
  if (nameLower === 'favicon.svg') return 100;

  // 2. High Priority: Any other SVG icon file
  if (
    ext === '.svg' &&
    PRIORITY_KEYWORDS.some((kw) => nameWithoutExt.includes(kw))
  ) {
    return 90;
  }

  // 3. Medium-High Priority: favicon.ico
  if (nameLower === 'favicon.ico') return 80;

  // 4. Medium Priority: Any other .ico file
  if (ext === '.ico') return 70;

  // 5. Medium-Low Priority: Non-SVG 'favicon' keyword match (e.g., favicon.png)
  if (nameWithoutExt.includes('favicon')) return 50;

  // 6. Low Priority: Other keyword matches (apple-touch-icon, icon, logo)
  if (PRIORITY_KEYWORDS.some((kw) => nameWithoutExt.includes(kw))) return 30;

  // 7. Fallback: Any generic supported image
  return 10;
}

/**
 * Recursively scans a directory up to maxDepth to locate the best matching icon.
 */
async function findFavicon(
  dirPath: string,
  currentDepth = 0,
  maxDepth = 5,
): Promise<string | null> {
  if (currentDepth > maxDepth) return null;

  try {
    const entries = await fs.readdir(dirPath, { withFileTypes: true });

    let bestMatchPath: string | null = null;
    let highestScore = 0;
    const subdirectories: string[] = [];

    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry.name);

      if (entry.isDirectory()) {
        // Skip common build / dependency output folders
        if (
          !['node_modules', '.git', 'dist', 'build', '.next'].includes(
            entry.name,
          )
        ) {
          subdirectories.push(fullPath);
        }
        continue;
      }

      if (entry.isFile()) {
        const ext = path.extname(entry.name).toLowerCase();

        if (ext in ICON_MIME_TYPES) {
          const score = getIconPriorityScore(entry.name, ext);

          // Instant return if we find the absolute highest quality match (favicon.svg)
          if (score === 100) {
            return fullPath;
          }

          if (score > highestScore) {
            highestScore = score;
            bestMatchPath = fullPath;
          }
        }
      }
    }

    // If an explicitly high-priority file (SVG/ICO or favicon.*) was found in current folder, return it
    if (bestMatchPath && highestScore >= 50) {
      return bestMatchPath;
    }

    // Otherwise, scan subdirectories recursively
    for (const subDir of subdirectories) {
      const subDirResult = await findFavicon(
        subDir,
        currentDepth + 1,
        maxDepth,
      );
      if (subDirResult) {
        const subExt = path.extname(subDirResult).toLowerCase();
        const subScore = getIconPriorityScore(
          path.basename(subDirResult),
          subExt,
        );

        // Prefer higher-quality SVG icons over lower-tier formats from parent directories
        if (subScore > highestScore) {
          highestScore = subScore;
          bestMatchPath = subDirResult;
        }

        // Return immediately if sub-directory found favicon.svg
        if (subScore === 100) return subDirResult;
      }
    }

    return bestMatchPath;
  } catch (_err) {
    // Gracefully handle unreadable/permission-denied folders
    return null;
  }
}

// Request validation schema
const discoverQuerySchema = z.object({
  dir: z.string().min(1, 'Directory path is required'),
  maxDepth: z.coerce.number().min(1).max(10).default(5),
});

const discovery = new Hono()

  // GET /api/discovery/favicon?dir=/path/to/project&maxDepth=5
  .get('/favicon', zValidator('query', discoverQuerySchema), async (c) => {
    const { dir: targetDir, maxDepth } = c.req.valid('query');

    // Verify directory exists
    try {
      const stat = await fs.stat(targetDir);
      if (!stat.isDirectory()) {
        return c.json({ error: 'Provided path is not a directory' }, 400);
      }
    } catch (_err) {
      return c.json(
        { error: 'Directory does not exist or is inaccessible' },
        404,
      );
    }

    // Discover icon path with favicon.svg prioritization
    const iconPath = await findFavicon(targetDir, 0, maxDepth);

    if (!iconPath) {
      return c.json(
        {
          found: false,
          message: `No favicon or icon file found within ${maxDepth} levels.`,
        },
        404,
      );
    }

    // Read file and encode to Base64 Data URI
    try {
      const ext = path.extname(iconPath).toLowerCase();
      const mimeType = ICON_MIME_TYPES[ext] || 'image/svg+xml';
      const fileBuffer = await fs.readFile(iconPath);
      const base64Data = fileBuffer.toString('base64');
      const dataUri = `data:${mimeType};base64,${base64Data}`;

      return c.json({
        found: true,
        fileName: path.basename(iconPath),
        filePath: iconPath,
        mimeType,
        dataUri,
      });
    } catch (err) {
      return c.json(
        {
          error: 'Failed to read or encode icon file',
          details: String(err),
        },
        500,
      );
    }
  });

export default discovery;
export type DiscoveryRoutes = typeof discovery;
