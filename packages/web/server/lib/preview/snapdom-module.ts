import { readFile } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';

/**
 * Reserved path served by the preview proxy itself instead of the upstream.
 *
 * The injected bridge dynamically imports this from the preview origin (which
 * is same-origin to the iframe), so no CORS is involved and snapDOM never has
 * to be bundled into the app or injected into every HTML response.
 */
export const RESERVED_PREVIEW_PREFIX = '/__aero_internal__/';
export const SNAPDOM_MODULE_PATH = `${RESERVED_PREVIEW_PREFIX}snapdom.mjs`;

const MODULE_HEADERS = {
  'content-type': 'text/javascript; charset=utf-8',
  'cache-control': 'no-store',
  'x-content-type-options': 'nosniff',
} as const;

let cachedSource: Promise<string> | null = null;

function candidatePaths(): string[] {
  const candidates: string[] = [];

  try {
    const require = createRequire(import.meta.url);

    // Resolving the package main gives us the dist directory; the ESM build
    // (snapdom.mjs) sits next to it.
    const main = require.resolve('@zumer/snapdom');

    candidates.push(path.join(path.dirname(main), 'snapdom.mjs'));
  } catch {
    /* fall through to cwd candidates */
  }

  const relative = path.join(
    'node_modules',
    '@zumer',
    'snapdom',
    'dist',
    'snapdom.mjs',
  );

  candidates.push(path.join(process.cwd(), relative));
  candidates.push(path.join(process.cwd(), 'packages', 'web', relative));

  return candidates;
}

async function readSnapdomSource(): Promise<string> {
  const attempted: string[] = [];

  for (const candidate of candidatePaths()) {
    attempted.push(candidate);

    try {
      return await readFile(candidate, 'utf8');
    } catch {
      /* try the next candidate */
    }
  }

  throw new Error(
    `Unable to locate @zumer/snapdom build. Tried: ${attempted.join(', ')}`,
  );
}

export function loadSnapdomModuleSource(): Promise<string> {
  if (!cachedSource) {
    cachedSource = readSnapdomSource().catch((error) => {
      cachedSource = null;
      throw error;
    });
  }

  return cachedSource;
}

export function isReservedPreviewPath(restPath: string): boolean {
  return restPath === SNAPDOM_MODULE_PATH;
}

/**
 * Serve a reserved asset from the Aero runtime, or return null when the path
 * is not reserved (the caller should continue proxying upstream).
 */
export async function serveReservedPreviewAsset(
  restPath: string,
): Promise<Response | null> {
  if (!isReservedPreviewPath(restPath)) {
    return null;
  }

  try {
    const source = await loadSnapdomModuleSource();

    return new Response(source, {
      status: 200,
      headers: MODULE_HEADERS,
    });
  } catch (error) {
    return new Response(
      JSON.stringify({
        error: 'snapdom module unavailable',
        reason: error instanceof Error ? error.message : String(error),
      }),
      {
        status: 500,
        headers: { 'content-type': 'application/json' },
      },
    );
  }
}
