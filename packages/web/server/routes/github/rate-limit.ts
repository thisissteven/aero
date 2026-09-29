// github/rate-limit.ts
//
// Process-global gate for GitHub's primary and secondary rate limits.
//
// Octokit runs without the throttling plugin, so a limit surfaces as a thrown
// 403/429. Resolving PR status across a fork network fans out into dozens of
// calls; once GitHub starts limiting, every additional call burns a round-trip
// and the caches hide the failure. Recording a cooldown lets us stop the burst
// and surface the reason instead.

const MAX_COOLDOWN_MS = 15 * 60 * 1000;
const DEFAULT_COOLDOWN_MS = 60 * 1000;

let rateLimitedUntil = 0;

type HeaderBag =
  | Headers
  | Record<string, string | string[] | undefined>
  | undefined;

function headerValue(headers: HeaderBag, name: string): string | null {
  if (!headers) return null;
  if (typeof (headers as Headers).get === 'function') {
    return (headers as Headers).get(name);
  }
  const raw = (headers as Record<string, string | string[] | undefined>)[name];
  return Array.isArray(raw) ? (raw[0] ?? null) : (raw ?? null);
}

function parseRetryAfterMs(error: unknown): number | null {
  const response = (error as { response?: { headers?: HeaderBag } })?.response;

  const retryAfter = headerValue(response?.headers, 'retry-after');
  if (retryAfter != null) {
    const seconds = Number(retryAfter);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
  }

  const reset = headerValue(response?.headers, 'x-ratelimit-reset');
  if (reset != null) {
    const delta = Number(reset) * 1000 - Date.now();
    if (Number.isFinite(delta) && delta > 0) return delta;
  }

  return null;
}

function errorStatus(error: unknown): number | undefined {
  const candidate = error as {
    status?: number;
    response?: { status?: number };
  };
  return candidate?.status ?? candidate?.response?.status;
}

/** True when an Octokit error represents a primary or secondary rate limit. */
export function isGitHubRateLimitError(error: unknown): boolean {
  const status = errorStatus(error);
  if (status === 429) return true;
  if (status !== 403) return false;

  const headers = (error as { response?: { headers?: HeaderBag } })?.response
    ?.headers;

  if (headerValue(headers, 'x-ratelimit-remaining') === '0') return true;
  if (headerValue(headers, 'retry-after') != null) return true;

  const message = String((error as { message?: string })?.message ?? '');
  return message.toLowerCase().includes('rate limit');
}

/** Record a cooldown after a detected rate-limit response. */
export function noteGitHubRateLimit(error: unknown): void {
  const retryMs = Math.min(
    parseRetryAfterMs(error) ?? DEFAULT_COOLDOWN_MS,
    MAX_COOLDOWN_MS,
  );
  const until = Date.now() + retryMs;
  if (until > rateLimitedUntil) {
    rateLimitedUntil = until;
    console.warn(
      `[github] rate limited — pausing GitHub calls for ~${Math.round(retryMs / 1000)}s`,
    );
  }
}

/** Notes the error if it is a rate-limit error. Returns whether it was. */
export function noteIfGitHubRateLimit(error: unknown): boolean {
  if (!isGitHubRateLimitError(error)) return false;
  noteGitHubRateLimit(error);
  return true;
}

export function isGitHubRateLimited(): boolean {
  return Date.now() < rateLimitedUntil;
}
