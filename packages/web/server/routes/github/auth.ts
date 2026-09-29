// github/auth.ts
//
// GitHub auth storage and client configuration.
//
// Device flow is used instead of a redirect flow so there is no client secret
// to ship and no callback to host. Tokens live in a 0600 file under Aero's
// config dir, written atomically so concurrent instances can't clobber it.
//
// A token written by an OpenChamber install is deliberately NOT adopted: it
// belongs to that app's OAuth client, so it would appear connected and then
// fail every call.

import fs from 'node:fs';
import path from 'node:path';
import { Octokit } from '@octokit/rest';

import { AERO_DIR } from '@/server/helper';
import { getSetting, updateSetting } from '@/server/services/settings';

import { getGhCliToken } from './gh-cli-credential';

const STORAGE_FILE = process.env.AERO_GITHUB_AUTH_FILE
  ? path.resolve(process.env.AERO_GITHUB_AUTH_FILE)
  : path.join(AERO_DIR, 'github-auth.json');

// Aero's own OAuth app. Device flow requires no secret, so the client id is a
// public identifier rather than a credential — it still lives in config so a
// self-hosted Aero can point at its own app.
const DEFAULT_GITHUB_CLIENT_ID = 'Ov23liXJERehNEtkGtiV';
// `workflow` is deliberately absent: a PR panel reads CI state through
// `checks:read` on public repos and `repo` on private ones, but never writes
// workflow files, so asking for it would over-collect consent.
const DEFAULT_GITHUB_SCOPES = 'repo read:org read:user user:email';

export const GH_CLI_ACCOUNT_ID = 'gh-cli';

const OCTOKIT_REQUEST_TIMEOUT_MS = 8_000;
const ETAG_CACHE_MAX_ENTRIES = 300;

export interface GitHubUser {
  login: string | null;
  avatarUrl: string | null;
  id: number | null;
  name: string | null;
  email: string | null;
}

export interface GitHubAuthEntry {
  accessToken: string;
  scope: string;
  tokenType: string;
  createdAt: number | null;
  user: GitHubUser | null;
  current: boolean;
  accountId: string;
}

export interface GitHubAuthAccountSummary {
  id: string;
  user: GitHubUser;
  scope: string;
  current: boolean;
  source?: 'gh-cli';
}

function ensureStorageDir(): void {
  const dir = path.dirname(STORAGE_FILE);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function readJsonFile<T>(filePath: string): T | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    const raw = fs.readFileSync(filePath, 'utf8').trim();
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed as T;
  } catch (error) {
    console.error(`Failed to read ${filePath}:`, error);
    return null;
  }
}

function writeJsonFile(filePath: string, payload: unknown): void {
  ensureStorageDir();
  // Write to a unique temp file then rename, so a reader never sees a partial
  // file and two instances can't interleave writes.
  const tmpFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf8');
  try {
    fs.chmodSync(tmpFile, 0o600);
  } catch {
    /* best-effort on platforms without POSIX modes */
  }
  fs.renameSync(tmpFile, filePath);
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    /* best-effort */
  }
}

/**
 * Every token ever stored lives in this file, so a disconnect only has to clear
 * the current entry; other accounts stay signed in.
 */
function resolveAccountId({
  user,
  accessToken,
  accountId,
}: {
  user?: GitHubUser | null;
  accessToken?: string;
  accountId?: string;
}): string {
  if (typeof accountId === 'string' && accountId.trim())
    return accountId.trim();
  if (user?.login?.trim()) return user.login.trim();
  if (typeof user?.id === 'number') return String(user.id);
  if (typeof accessToken === 'string' && accessToken.trim()) {
    return `token:${accessToken.slice(0, 8)}`;
  }
  return '';
}

function normalizeAuthEntry(
  entry: Partial<GitHubAuthEntry> | null | undefined,
): Omit<GitHubAuthEntry, 'current' | 'accountId'> | null {
  if (!entry || typeof entry !== 'object') return null;
  const accessToken =
    typeof entry.accessToken === 'string' ? entry.accessToken : '';
  if (!accessToken) return null;

  const user = entry.user
    ? {
        login: typeof entry.user.login === 'string' ? entry.user.login : null,
        avatarUrl:
          typeof entry.user.avatarUrl === 'string'
            ? entry.user.avatarUrl
            : null,
        id: typeof entry.user.id === 'number' ? entry.user.id : null,
        name: typeof entry.user.name === 'string' ? entry.user.name : null,
        email: typeof entry.user.email === 'string' ? entry.user.email : null,
      }
    : null;

  return {
    accessToken,
    scope: typeof entry.scope === 'string' ? entry.scope : '',
    tokenType: typeof entry.tokenType === 'string' ? entry.tokenType : 'bearer',
    createdAt: typeof entry.createdAt === 'number' ? entry.createdAt : null,
    user,
  };
}

interface StoredAuthFile {
  accounts?: Record<string, Omit<GitHubAuthEntry, 'current' | 'accountId'>>;
  currentAccountId?: string | null;
}

function readStoredAuth(): StoredAuthFile {
  return readJsonFile<StoredAuthFile>(STORAGE_FILE) ?? {};
}

export function getGitHubAuth(): GitHubAuthEntry | null {
  const stored = readStoredAuth();
  const currentId = stored.currentAccountId ?? null;
  if (!currentId || !stored.accounts?.[currentId]) return null;
  const entry = normalizeAuthEntry(stored.accounts[currentId]);
  if (!entry) return null;
  return { ...entry, current: true, accountId: currentId };
}

export function getGitHubAuthAccounts(): GitHubAuthAccountSummary[] {
  const stored = readStoredAuth();
  const currentId = stored.currentAccountId ?? null;
  return Object.entries(stored.accounts ?? {})
    .map(([accountId, entry]) => {
      const normalized = normalizeAuthEntry(entry);
      if (!normalized?.user) return null;
      return {
        id: accountId,
        user: normalized.user,
        scope: normalized.scope,
        current: accountId === currentId,
      } satisfies GitHubAuthAccountSummary;
    })
    .filter((entry): entry is GitHubAuthAccountSummary => entry !== null);
}

export function setGitHubAuth(params: {
  accessToken: string;
  scope?: string;
  tokenType?: string;
  user?: GitHubUser | null;
  accountId?: string;
}): GitHubAuthEntry {
  const stored = readStoredAuth();
  const normalized = normalizeAuthEntry(params);
  if (!normalized) throw new Error('Invalid GitHub auth payload');
  const accountId = resolveAccountId({
    user: normalized.user,
    accessToken: normalized.accessToken,
    accountId: params.accountId,
  });
  stored.accounts = stored.accounts ?? {};
  stored.accounts[accountId] = normalized;
  stored.currentAccountId = accountId;
  writeJsonFile(STORAGE_FILE, stored);
  return { ...normalized, current: true, accountId };
}

export function activateGitHubAuth(accountId: string): GitHubAuthEntry | null {
  const stored = readStoredAuth();
  if (!stored.accounts?.[accountId]) return null;
  stored.currentAccountId = accountId;
  writeJsonFile(STORAGE_FILE, stored);
  const normalized = normalizeAuthEntry(stored.accounts[accountId]);
  return normalized ? { ...normalized, current: true, accountId } : null;
}

export function clearGitHubAuth(): boolean {
  try {
    const stored = readStoredAuth();
    const currentId = stored.currentAccountId ?? null;
    if (!stored.accounts || !currentId) return true;
    delete stored.accounts[currentId];
    stored.currentAccountId = Object.keys(stored.accounts)[0] ?? null;
    if (!stored.currentAccountId) {
      delete stored.accounts;
    }
    writeJsonFile(STORAGE_FILE, stored);
    return true;
  } catch (error) {
    console.error('Failed to clear GitHub auth:', error);
    return false;
  }
}

export async function getGitHubClientId(): Promise<string> {
  const fromEnv = process.env.AERO_GITHUB_CLIENT_ID?.trim();
  if (fromEnv) return fromEnv;
  const stored = await getSetting(['githubClientId']);
  return typeof stored === 'string' && stored.trim()
    ? stored.trim()
    : DEFAULT_GITHUB_CLIENT_ID;
}

export async function getGitHubScopes(): Promise<string> {
  const fromEnv = process.env.AERO_GITHUB_SCOPES?.trim();
  if (fromEnv) return fromEnv;
  const stored = await getSetting(['githubScopes']);
  return typeof stored === 'string' && stored.trim()
    ? stored.trim()
    : DEFAULT_GITHUB_SCOPES;
}

export async function isGhCliDisabled(): Promise<boolean> {
  return Boolean(await getSetting(['ghCliDisabled']));
}

export async function setGhCliDisabled(disabled: boolean): Promise<void> {
  await updateSetting(['ghCliDisabled'], Boolean(disabled));
  if (disabled) await updateSetting(['ghCliActive'], false);
}

export async function isGhCliActive(): Promise<boolean> {
  if (await isGhCliDisabled()) return false;
  return Boolean(await getSetting(['ghCliActive']));
}

export async function setGhCliActive(active: boolean): Promise<void> {
  const disabled = await isGhCliDisabled();
  await updateSetting(['ghCliActive'], Boolean(active) && !disabled);
}

export const GITHUB_AUTH_FILE = STORAGE_FILE;

// ---------------------------------------------------------------------------
// Octokit
// ---------------------------------------------------------------------------

const etagCache = new Map<
  string,
  { etag: string; body: ArrayBuffer; headers: Headers }
>();

function rememberEtag(
  key: string,
  etag: string,
  body: ArrayBuffer,
  headers: Headers,
): void {
  etagCache.delete(key);
  etagCache.set(key, { etag, body, headers });
  if (etagCache.size > ETAG_CACHE_MAX_ENTRIES) {
    const oldest = etagCache.keys().next().value;
    if (oldest !== undefined) etagCache.delete(oldest);
  }
}

const nativeFetch = globalThis.fetch;

const timeoutFetch: typeof fetch = Object.assign(
  (url: URL | RequestInfo, options: RequestInit = {}) => {
    if (options.signal) return nativeFetch(url, options);
    return nativeFetch(url, {
      ...options,
      signal: AbortSignal.timeout(OCTOKIT_REQUEST_TIMEOUT_MS),
    });
  },
  {
    preconnect:
      (nativeFetch as unknown as { preconnect?: (url: string) => void })
        .preconnect ??
      (() => {
        //
      }),
  },
) as typeof fetch;

/**
 * GitHub honours conditional GETs for most read endpoints, and PR status polls
 * re-request the same URLs constantly. Serving a 304 from memory keeps those
 * polls off the rate limit entirely.
 */
function createConditionalFetch(token: string): typeof fetch {
  return Object.assign(
    async (url: URL | RequestInfo, options: RequestInit = {}) => {
      const method = (options.method || 'GET').toUpperCase();
      if (method !== 'GET') return timeoutFetch(url, options);

      const cacheKey = `${token}\n${String(url)}`;
      const cached = etagCache.get(cacheKey);
      const headers = { ...(options.headers as Record<string, string>) };
      if (cached?.etag) headers['if-none-match'] = cached.etag;

      const response = await timeoutFetch(url, { ...options, headers });

      if (response.status === 304 && cached) {
        rememberEtag(cacheKey, cached.etag, cached.body, cached.headers);
        return new Response(cached.body, {
          status: 200,
          headers: cached.headers,
        });
      }

      if (response.ok) {
        const etag = response.headers.get('etag');
        if (etag) {
          const body = await response.arrayBuffer();
          rememberEtag(cacheKey, etag, body, response.headers);
          return new Response(body, {
            status: response.status,
            headers: response.headers,
          });
        }
      }

      return response;
    },
    {
      preconnect:
        (nativeFetch as unknown as { preconnect?: (url: string) => void })
          .preconnect ??
        (() => {
          //
        }),
    },
  ) as typeof fetch;
}

export function createOctokit(token: string): Octokit {
  return new Octokit({
    auth: token,
    request: { fetch: createConditionalFetch(token) },
  });
}

/**
 * The client every route uses. When the gh CLI is the active credential it
 * wins, because the user explicitly picked it and its token may be scoped
 * differently than a token issued by Aero's OAuth app.
 */
export async function getOctokitOrNull(): Promise<Octokit | null> {
  if (await isGhCliActive()) {
    const cliToken = getGhCliToken();
    if (cliToken) return createOctokit(cliToken);
  }
  const auth = getGitHubAuth();
  if (!auth?.accessToken) return null;
  return createOctokit(auth.accessToken);
}
