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

function sweepExpired(): void {
  const now = Date.now();

  for (const [id, target] of targets) {
    if (target.expiresAt <= now) {
      targets.delete(id);
    }
  }
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

  const target: PreviewTarget = {
    id: createId(),
    kind: 'http',
    origin: origin.replace(/\/+$/, ''),
    createdAt: now,
    expiresAt: now + Math.max(15_000, Math.trunc(ttlMs)),
  };

  targets.set(target.id, target);

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
    expiresAt: now + Math.max(15_000, Math.trunc(ttlMs)),
  };

  targets.set(target.id, target);

  return target;
}

export function getPreviewTarget(id: string): PreviewTarget | null {
  const target = targets.get(id);

  if (!target) {
    return null;
  }

  if (target.expiresAt <= Date.now()) {
    targets.delete(id);
    return null;
  }

  return target;
}

export function deletePreviewTarget(id: string): void {
  targets.delete(id);
}
