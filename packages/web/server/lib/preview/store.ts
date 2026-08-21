import { randomBytes } from 'crypto';

interface PreviewTarget {
  id: string;
  url: string;
  token: string;
  expiresAt: number;
}

const targets = new Map<string, PreviewTarget>();
const TTL_MS = 10 * 60 * 1000;

export function createPreviewTarget(url: string): PreviewTarget {
  const entry: PreviewTarget = {
    id: randomBytes(12).toString('base64url'),
    token: randomBytes(24).toString('base64url'),
    url,
    expiresAt: Date.now() + TTL_MS,
  };
  targets.set(entry.id, entry);
  return entry;
}

export function getPreviewTarget(id: string): PreviewTarget | null {
  const entry = targets.get(id);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    targets.delete(id);
    return null;
  }
  return entry;
}

setInterval(() => {
  const now = Date.now();
  for (const [id, e] of targets) if (now > e.expiresAt) targets.delete(id);
}, 60_000);
