import { randomBytes } from 'node:crypto';

const DEFAULT_TTL_MS = 30 * 60 * 1000;

export interface PreviewTarget {
  id: string;
  origin: string;
  createdAt: number;
  expiresAt: number;
}

const targets = new Map<string, PreviewTarget>();

function sweepExpired(): void {
  const now = Date.now();

  for (const [id, target] of targets) {
    if (target.expiresAt <= now) {
      targets.delete(id);
    }
  }
}

export function createPreviewTarget(
  origin: string,
  ttlMs = DEFAULT_TTL_MS,
): PreviewTarget {
  sweepExpired();

  const now = Date.now();
  const id = randomBytes(16).toString('hex');

  const target: PreviewTarget = {
    id,
    origin: origin.replace(/\/+$/, ''),
    createdAt: now,
    expiresAt: now + Math.max(15_000, Math.trunc(ttlMs)),
  };

  targets.set(id, target);

  return target;
}

export function getPreviewTarget(id: string): PreviewTarget | null {
  sweepExpired();

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
