import { randomBytes } from 'node:crypto';

const DEFAULT_TTL_MS = 30 * 60 * 1000;

export type PreviewTarget =
  | {
      id: string;
      kind: 'http';
      origin: string;
      createdAt: number;
      expiresAt: number;
    }
  | {
      id: string;
      kind: 'file';
      filePath: string;
      rootPath: string;
      createdAt: number;
      expiresAt: number;
    };

const targets = new Map<string, PreviewTarget>();

/**
 * Stable id per upstream origin / local file path.
 *
 * The preview origin is derived from the target id, so reusing the id for
 * the same upstream keeps the origin (and therefore localStorage, cookies
 * and history) stable across Aero reloads and repeated navigations.
 */
const httpOriginIndex = new Map<string, string>();
const filePathIndex = new Map<string, string>();

function minTtl(ttlMs: number): number {
  return Math.max(15_000, Math.trunc(ttlMs));
}

function forget(target: PreviewTarget): void {
  targets.delete(target.id);

  if (target.kind === 'http') {
    if (httpOriginIndex.get(target.origin) === target.id) {
      httpOriginIndex.delete(target.origin);
    }
  } else if (filePathIndex.get(target.filePath) === target.id) {
    filePathIndex.delete(target.filePath);
  }
}

function sweepExpired(): void {
  const now = Date.now();

  for (const target of Array.from(targets.values())) {
    if (target.expiresAt <= now) {
      forget(target);
    }
  }
}

function touch(target: PreviewTarget, ttlMs: number): PreviewTarget {
  target.expiresAt = Date.now() + minTtl(ttlMs);

  return target;
}

function createId(): string {
  return randomBytes(16).toString('hex');
}

export function createPreviewTarget(
  origin: string,
  ttlMs = DEFAULT_TTL_MS,
): PreviewTarget {
  sweepExpired();

  const now = Date.now();
  const normalized = origin.replace(/\/+$/, '');

  const target: PreviewTarget = {
    id: createId(),
    kind: 'http',
    origin: normalized,
    createdAt: now,
    expiresAt: now + minTtl(ttlMs),
  };

  targets.set(target.id, target);
  httpOriginIndex.set(normalized, target.id);

  return target;
}

export function createLocalPreviewTarget(
  filePath: string,
  rootPath: string,
  ttlMs = DEFAULT_TTL_MS,
): PreviewTarget {
  sweepExpired();

  const now = Date.now();

  const target: PreviewTarget = {
    id: createId(),
    kind: 'file',
    filePath,
    rootPath,
    createdAt: now,
    expiresAt: now + minTtl(ttlMs),
  };

  targets.set(target.id, target);
  filePathIndex.set(filePath, target.id);

  return target;
}

/**
 * Return the existing (still valid) target for an upstream origin, or create
 * one. Keeps the preview origin stable for the same upstream server.
 */
export function getOrCreatePreviewTarget(
  origin: string,
  ttlMs = DEFAULT_TTL_MS,
): PreviewTarget {
  const normalized = origin.replace(/\/+$/, '');
  const existingId = httpOriginIndex.get(normalized);

  if (existingId) {
    const existing = targets.get(existingId);

    if (
      existing &&
      existing.kind === 'http' &&
      existing.expiresAt > Date.now()
    ) {
      return touch(existing, ttlMs);
    }

    httpOriginIndex.delete(normalized);
  }

  return createPreviewTarget(normalized, ttlMs);
}

export function getOrCreateLocalPreviewTarget(
  filePath: string,
  rootPath: string,
  ttlMs = DEFAULT_TTL_MS,
): PreviewTarget {
  const existingId = filePathIndex.get(filePath);

  if (existingId) {
    const existing = targets.get(existingId);

    if (
      existing &&
      existing.kind === 'file' &&
      existing.expiresAt > Date.now()
    ) {
      return touch(existing, ttlMs);
    }

    filePathIndex.delete(filePath);
  }

  return createLocalPreviewTarget(filePath, rootPath, ttlMs);
}

export function getPreviewTarget(id: string): PreviewTarget | null {
  const target = targets.get(id);

  if (!target) {
    return null;
  }

  if (target.expiresAt <= Date.now()) {
    forget(target);
    return null;
  }

  // Sliding TTL: an actively previewed target stays alive.
  return touch(target, DEFAULT_TTL_MS);
}

export function deletePreviewTarget(id: string): void {
  const target = targets.get(id);

  if (target) {
    forget(target);
  }
}
