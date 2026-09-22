// github-service.ts
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Octokit } from '@octokit/rest';
import { z } from 'zod';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const OPENCHAMBER_DATA_DIR = process.env.OPENCHAMBER_DATA_DIR
  ? path.resolve(process.env.OPENCHAMBER_DATA_DIR)
  : path.join(os.homedir(), '.config', 'openchamber');

const STORAGE_DIR = OPENCHAMBER_DATA_DIR;
const STORAGE_FILE = path.join(STORAGE_DIR, 'github-auth.json');
const SETTINGS_FILE = path.join(OPENCHAMBER_DATA_DIR, 'settings.json');

const DEFAULT_GITHUB_CLIENT_ID = 'Ov23lizomPOC3eFYo56r';
const DEFAULT_GITHUB_SCOPES = 'repo read:org workflow read:user user:email';
const GH_CLI_ACCOUNT_ID = 'gh-cli';

const OCTOKIT_REQUEST_TIMEOUT_MS = 8_000;
const ETAG_CACHE_MAX_ENTRIES = 300;

const PR_STATUS_CACHE_TTL_MS = 90_000;
const PR_STATUS_CACHE_MAX_ENTRIES = 200;
const PR_STATUS_RESOLVE_TIMEOUT_MS = 12_000;

const PR_CONTEXT_CACHE_TTL_MS = 30_000;
const PR_CONTEXT_CACHE_MAX_ENTRIES = 50;

// ---------------------------------------------------------------------------
// Errors
// ---------------------------------------------------------------------------

export class GitHubNotConnectedError extends Error {
  readonly code = 'GITHUB_NOT_CONNECTED' as const;
  constructor() {
    super('GitHub not connected');
    this.name = 'GitHubNotConnectedError';
  }
}

export class GitHubAuthInvalidError extends Error {
  readonly code = 'GITHUB_AUTH_INVALID' as const;
  constructor() {
    super('GitHub authentication is invalid');
    this.name = 'GitHubAuthInvalidError';
  }
}

export class GitHubRepoNotFoundError extends Error {
  readonly code = 'GITHUB_REPO_NOT_FOUND' as const;
  constructor(public readonly directory: string) {
    super(`Could not resolve GitHub repo for directory: ${directory}`);
    this.name = 'GitHubRepoNotFoundError';
  }
}

// ---------------------------------------------------------------------------
// Auth storage (auth.js equivalent)
// ---------------------------------------------------------------------------

function ensureStorageDir() {
  if (!fs.existsSync(STORAGE_DIR)) {
    fs.mkdirSync(STORAGE_DIR, { recursive: true });
  }
}

function readJsonFile<T>(filePath: string): T | null {
  ensureStorageDir();
  if (!fs.existsSync(filePath)) return null;
  try {
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

function writeJsonFile(filePath: string, payload: unknown) {
  ensureStorageDir();
  const tmpFile = `${filePath}.${process.pid}.${Date.now()}.tmp`;
  fs.writeFileSync(tmpFile, JSON.stringify(payload, null, 2), 'utf8');
  try {
    fs.chmodSync(tmpFile, 0o600);
  } catch {
    /* best-effort */
  }
  fs.renameSync(tmpFile, filePath);
  try {
    fs.chmodSync(filePath, 0o600);
  } catch {
    /* best-effort */
  }
}

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

interface StoredAuthFile {
  accounts?: Record<string, Omit<GitHubAuthEntry, 'current' | 'accountId'>>;
  currentAccountId?: string | null;
}

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

function readStoredAuth(): StoredAuthFile {
  return readJsonFile<StoredAuthFile>(STORAGE_FILE) ?? {};
}

export function getGitHubAuth(): GitHubAuthEntry | null {
  const stored = readStoredAuth();
  const currentId = stored.currentAccountId ?? null;
  if (!currentId || !stored.accounts?.[currentId]) return null;
  const entry = normalizeAuthEntry(stored.accounts[currentId]);
  if (!entry) return null;
  return {
    ...entry,
    current: true,
    accountId: currentId,
  };
}

export function getGitHubAuthAccounts(): GitHubAuthEntry[] {
  const stored = readStoredAuth();
  const currentId = stored.currentAccountId ?? null;
  return Object.entries(stored.accounts ?? {})
    .map(([accountId, entry]) => {
      const normalized = normalizeAuthEntry(entry);
      if (!normalized) return null;
      return {
        ...normalized,
        current: accountId === currentId,
        accountId,
      };
    })
    .filter((e): e is GitHubAuthEntry => e !== null);
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

export function clearGitHubAuth(): void {
  const stored = readStoredAuth();
  stored.currentAccountId = null;
  writeJsonFile(STORAGE_FILE, stored);
}

export function getGitHubClientId(): string {
  if (process.env.OPENCHAMBER_GITHUB_CLIENT_ID) {
    return process.env.OPENCHAMBER_GITHUB_CLIENT_ID;
  }
  const settings = readJsonFile<{ githubClientId?: string }>(SETTINGS_FILE);
  return settings?.githubClientId ?? DEFAULT_GITHUB_CLIENT_ID;
}

export function getGitHubScopes(): string {
  if (process.env.OPENCHAMBER_GITHUB_SCOPES) {
    return process.env.OPENCHAMBER_GITHUB_SCOPES;
  }
  const settings = readJsonFile<{ githubScopes?: string }>(SETTINGS_FILE);
  return settings?.githubScopes ?? DEFAULT_GITHUB_SCOPES;
}

// ---------------------------------------------------------------------------
// Device flow (device-flow.js equivalent)
// ---------------------------------------------------------------------------

const DEVICE_CODE_URL = 'https://github.com/login/device/code';
const ACCESS_TOKEN_URL = 'https://github.com/login/oauth/access_token';
const DEVICE_GRANT_TYPE = 'urn:ietf:params:oauth:grant-type:device_code';

function encodeForm(params: Record<string, string | undefined>) {
  const body = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value == null) continue;
    body.set(key, String(value));
  }
  return body.toString();
}

async function postForm<T>(
  url: string,
  params: Record<string, string | undefined>,
): Promise<T> {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Accept: 'application/json',
    },
    body: encodeForm(params),
  });
  const payload = await response.json().catch(() => null);
  if (!response.ok) {
    const message =
      (payload as any)?.error_description ||
      (payload as any)?.error ||
      response.statusText;
    const error = new Error(message || 'GitHub request failed');
    (error as any).status = response.status;
    (error as any).payload = payload;
    throw error;
  }
  return payload as T;
}

export interface DeviceFlowStart {
  device_code: string;
  user_code: string;
  verification_uri: string;
  expires_in: number;
  interval: number;
}

export interface DeviceFlowToken {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export function startDeviceFlow(params: {
  clientId?: string;
  scope?: string;
}): Promise<DeviceFlowStart> {
  return postForm<DeviceFlowStart>(DEVICE_CODE_URL, {
    client_id: params.clientId ?? getGitHubClientId(),
    scope: params.scope ?? getGitHubScopes(),
  });
}

export function exchangeDeviceCode(params: {
  clientId?: string;
  deviceCode: string;
}): Promise<DeviceFlowToken> {
  return postForm<DeviceFlowToken>(ACCESS_TOKEN_URL, {
    client_id: params.clientId ?? getGitHubClientId(),
    device_code: params.deviceCode,
    grant_type: DEVICE_GRANT_TYPE,
  });
}

// ---------------------------------------------------------------------------
// Octokit factory (octokit.js equivalent)
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
) {
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

export function getOctokitOrNull(): Octokit | null {
  const auth = getGitHubAuth();
  const token = auth?.accessToken;
  if (!token) return null;
  return createOctokit(token);
}

// ---------------------------------------------------------------------------
// Repo resolution (repo/index.js equivalent)
// ---------------------------------------------------------------------------

export interface ParsedGitHubRemote {
  owner: string;
  repo: string;
  url: string;
}

export function parseGitHubRemoteUrl(raw: string): ParsedGitHubRemote | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;

  // git@github.com:owner/repo.git
  const sshMatch = trimmed.match(/^git@github\.com:([^/]+)\/(.+?)(?:\.git)?$/);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2].replace(/\.git$/, ''),
      url: trimmed,
    };
  }

  // https://github.com/owner/repo.git
  const httpsMatch = trimmed.match(
    /^https?:\/\/github\.com\/([^/]+)\/(.+?)(?:\.git)?$/,
  );
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2].replace(/\.git$/, ''),
      url: trimmed,
    };
  }

  // ssh://git@github.com/owner/repo.git
  const sshUrlMatch = trimmed.match(
    /^ssh:\/\/git@github\.com\/([^/]+)\/(.+?)(?:\.git)?$/,
  );
  if (sshUrlMatch) {
    return {
      owner: sshUrlMatch[1],
      repo: sshUrlMatch[2].replace(/\.git$/, ''),
      url: trimmed,
    };
  }

  return null;
}

export async function resolveGitHubRepoFromDirectory(
  directory: string,
  remoteName = 'origin',
): Promise<{ owner: string; repo: string } | null> {
  const { execSync } = await import('node:child_process');
  try {
    const remoteUrl = execSync(
      `git -C "${directory}" remote get-url ${remoteName}`,
      { encoding: 'utf8' },
    ).trim();
    const parsed = parseGitHubRemoteUrl(remoteUrl);
    if (!parsed) return null;
    return { owner: parsed.owner, repo: parsed.repo };
  } catch {
    return null;
  }
}

// ---------------------------------------------------------------------------
// Fork detection (repo/fork-detection.js equivalent)
// ---------------------------------------------------------------------------

export interface RepoNetworkEntry {
  owner: string;
  repo: string;
}

export async function resolveRepoNetwork(
  octokit: Octokit,
  directory: string,
): Promise<RepoNetworkEntry[]> {
  const repo = await resolveGitHubRepoFromDirectory(directory);
  if (!repo) return [];

  try {
    const { data } = await octokit.rest.repos.get(repo);
    const parent = data.parent;
    const source = data.source;
    const network: RepoNetworkEntry[] = [
      { owner: data.owner.login, repo: data.name },
    ];
    if (parent) {
      network.push({ owner: parent.owner.login, repo: parent.name });
    }
    if (source && source.full_name !== data.full_name) {
      network.push({ owner: source.owner.login, repo: source.name });
    }
    return network;
  } catch {
    return [];
  }
}

// ---------------------------------------------------------------------------
// PR status (pr-status.js equivalent — simplified)
// ---------------------------------------------------------------------------

export interface CheckRunSummary {
  state: 'success' | 'failure' | 'pending' | 'unknown';
  total: number;
  success: number;
  failure: number;
  pending: number;
  inProgress: number;
  queued: number;
  startedAt?: string;
}

export function summarizeCheckRuns(
  checkRuns: Array<{
    status?: string | null;
    conclusion?: string | null;
    started_at?: string | null;
    completed_at?: string | null;
    app?: { id?: number; slug?: string } | null;
    name?: string | null;
    id?: number;
  }>,
): CheckRunSummary {
  const counts = {
    success: 0,
    failure: 0,
    pending: 0,
    inProgress: 0,
    queued: 0,
  };
  let startedAt: string | null = null;

  for (const run of checkRuns) {
    const status = run?.status ?? null;
    const conclusion = run?.conclusion ?? null;

    if (status === 'in_progress') {
      counts.pending += 1;
      counts.inProgress += 1;
      const runStartedAt =
        typeof run?.started_at === 'string' ? run.started_at : null;
      if (runStartedAt && (!startedAt || runStartedAt < startedAt)) {
        startedAt = runStartedAt;
      }
      continue;
    }

    if (status === 'queued' || status === 'pending' || status === 'requested') {
      counts.pending += 1;
      counts.queued += 1;
      continue;
    }

    if (!conclusion) {
      counts.pending += 1;
      continue;
    }

    if (
      conclusion === 'success' ||
      conclusion === 'neutral' ||
      conclusion === 'skipped'
    ) {
      counts.success += 1;
    } else {
      counts.failure += 1;
    }
  }

  const total = counts.success + counts.failure + counts.pending;
  const state: CheckRunSummary['state'] =
    counts.failure > 0
      ? 'failure'
      : counts.pending > 0
        ? 'pending'
        : total > 0
          ? 'success'
          : 'unknown';

  return {
    state,
    total,
    ...counts,
    ...(startedAt ? { startedAt } : {}),
  };
}

export interface PrStatusResult {
  found: boolean;
  number?: number;
  url?: string;
  state?: string;
  title?: string;
  headRef?: string;
  baseRef?: string;
  mergeable?: boolean | null;
  mergeableState?: string;
  draft?: boolean;
  checks?: CheckRunSummary;
  repo?: { owner: string; repo: string };
}

async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const error = new Error(`${label} timed out after ${timeoutMs}ms`);
      (error as any).code = 'ETIMEDOUT';
      reject(error);
    }, timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

const prStatusCache = new Map<
  string,
  { data: PrStatusResult; fetchedAt: number }
>();

export async function resolveGitHubPrStatus(
  octokit: Octokit,
  directory: string,
  branch: string,
  remote?: string,
): Promise<PrStatusResult> {
  const cacheKey = `${directory}\n${branch}\n${remote ?? ''}`;
  const cached = prStatusCache.get(cacheKey);
  const now = Date.now();

  if (cached && now - cached.fetchedAt < PR_STATUS_CACHE_TTL_MS) {
    return cached.data;
  }

  const repo = await resolveGitHubRepoFromDirectory(directory, remote);
  if (!repo) return { found: false };

  try {
    const result = await withTimeout(
      (async (): Promise<PrStatusResult> => {
        const { data: pulls } = await octokit.rest.pulls.list({
          ...repo,
          head: `${repo.owner}:${branch}`,
          state: 'all',
          per_page: 1,
        });

        if (!pulls.length) return { found: false };

        const listItem = pulls[0];

        // pulls.list omits mergeable — fetch the full PR to get it.
        const { data: pr } = await octokit.rest.pulls.get({
          ...repo,
          pull_number: listItem.number,
        });

        const checks = await (async (): Promise<
          CheckRunSummary | undefined
        > => {
          try {
            const { data: checkRuns } = await octokit.rest.checks.listForRef({
              ...repo,
              ref: pr.head.sha,
              per_page: 100,
            });
            return summarizeCheckRuns(checkRuns.check_runs);
          } catch {
            return undefined;
          }
        })();

        return {
          found: true,
          number: pr.number,
          url: pr.html_url,
          state: pr.state,
          title: pr.title,
          headRef: pr.head.ref,
          baseRef: pr.base.ref,
          mergeable: pr.mergeable ?? null,
          checks,
          repo,
        };
      })(),
      PR_STATUS_RESOLVE_TIMEOUT_MS,
      'resolveGitHubPrStatus',
    );

    prStatusCache.set(cacheKey, { data: result, fetchedAt: now });
    if (prStatusCache.size > PR_STATUS_CACHE_MAX_ENTRIES) {
      const oldest = prStatusCache.keys().next().value;
      if (oldest !== undefined) prStatusCache.delete(oldest);
    }

    return result;
  } catch {
    return { found: false };
  }
}

// ---------------------------------------------------------------------------
// Zod schemas
// ---------------------------------------------------------------------------

export const githubDirectorySchema = z.string().min(1);

export const githubAuthStatusQuerySchema = z.object({
  directory: githubDirectorySchema.optional(),
});

export const githubDeviceFlowStartBodySchema = z.object({
  clientId: z.string().optional(),
  scope: z.string().optional(),
});

export const githubDeviceFlowExchangeBodySchema = z.object({
  clientId: z.string().optional(),
  deviceCode: z.string().min(1),
});

export const githubActivateBodySchema = z.object({
  accountId: z.string().min(1),
});

export const githubPrStatusQuerySchema = z.object({
  directory: githubDirectorySchema,
  branch: z.string().min(1),
  remote: z.string().optional(),
});
