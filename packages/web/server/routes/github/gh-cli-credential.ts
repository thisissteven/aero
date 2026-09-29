// github/gh-cli-credential.ts
//
// Lets an already-authenticated `gh` CLI stand in for a device-flow token, so
// users who are signed in to gh don't have to connect a second time. The token
// is read from the CLI on demand rather than copied into Aero's config.

import { execFileSync } from 'node:child_process';

const CACHE_TTL_MS = 30_000;

let cachedToken: string | null = null;
let cachedAt = 0;
let hasCachedToken = false;

function fetchGhCliToken(): string | null {
  try {
    const token = execFileSync('gh', ['auth', 'token'], {
      encoding: 'utf8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 5000,
      windowsHide: true,
    }).trim();
    return token || null;
  } catch {
    return null;
  }
}

export function getGhCliToken(): string | null {
  const now = Date.now();
  if (hasCachedToken && now - cachedAt < CACHE_TTL_MS) {
    return cachedToken;
  }
  const token = fetchGhCliToken();
  cachedToken = token;
  cachedAt = now;
  hasCachedToken = true;
  return token;
}

export function clearGhCliTokenCache(): void {
  cachedToken = null;
  cachedAt = 0;
  hasCachedToken = false;
}
