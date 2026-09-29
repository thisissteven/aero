// github/repo.ts
//
// Maps a local checkout to GitHub repos: parsing remote URLs, resolving a
// directory to a repo, and expanding a fork into its upstream network.

import type { Octokit } from '@octokit/rest';

import { getRemoteUrl, resolveGitDir } from '@/server/routes/git/service';

import { noteIfGitHubRateLimit } from './rate-limit';

export interface GitHubRepoRef {
  owner: string;
  repo: string;
  url: string;
}

export interface RepoNetworkEntry extends GitHubRepoRef {
  source: 'origin' | 'upstream';
}

const REPO_METADATA_TTL_MS = 5 * 60_000;
const REPO_METADATA_CACHE_MAX_ENTRIES = 200;

/** Trimmed, non-null string. GitHub returns null for several string fields. */
export function normalizeText(value: unknown): string {
  return typeof value === 'string' ? value.trim() : '';
}

function normalizeLower(value: unknown): string {
  return normalizeText(value).toLowerCase();
}

/** Stable `owner/repo` key, lowercased, or '' when either side is missing. */
export function normalizeRepoKey(owner: unknown, repo: unknown): string {
  const normalizedOwner = normalizeLower(owner);
  const normalizedRepo = normalizeLower(repo);
  if (!normalizedOwner || !normalizedRepo) return '';
  return `${normalizedOwner}/${normalizedRepo}`;
}

const repoMetadataCache = new Map<
  string,
  { data: Record<string, unknown> | null; fetchedAt: number }
>();

function setRepoMetadataCache(
  repoKey: string,
  data: Record<string, unknown> | null,
): void {
  if (
    repoMetadataCache.size >= REPO_METADATA_CACHE_MAX_ENTRIES &&
    !repoMetadataCache.has(repoKey)
  ) {
    const oldest = repoMetadataCache.keys().next().value;
    if (oldest !== undefined) repoMetadataCache.delete(oldest);
  }
  repoMetadataCache.set(repoKey, { data, fetchedAt: Date.now() });
}

export function invalidateRepoMetadataCache(): void {
  repoMetadataCache.clear();
}

export function parseGitHubRemoteUrl(raw: unknown): GitHubRepoRef | null {
  if (typeof raw !== 'string') return null;
  const value = raw.trim();
  if (!value) return null;

  const build = (owner: string, repo: string): GitHubRepoRef | null => {
    const name = repo.replace(/\.git$/, '');
    if (!owner || !name) return null;
    return { owner, repo: name, url: `https://github.com/${owner}/${name}` };
  };

  // git@github.com:OWNER/REPO.git
  if (value.startsWith('git@github.com:')) {
    const [owner, repo] = value.slice('git@github.com:'.length).split('/');
    return build(owner, repo);
  }

  // ssh://git@github.com/OWNER/REPO.git
  if (value.startsWith('ssh://git@github.com/')) {
    const [owner, repo] = value
      .slice('ssh://git@github.com/'.length)
      .split('/');
    return build(owner, repo);
  }

  // https://github.com/OWNER/REPO(.git)
  try {
    const url = new URL(value);
    if (url.hostname !== 'github.com') return null;
    const [owner, repo] = url.pathname
      .replace(/^\/+/, '')
      .replace(/\/+$/, '')
      .split('/');
    return build(owner, repo);
  } catch {
    return null;
  }
}

export async function resolveGitHubRepoFromDirectory(
  directory: string,
  remoteName = 'origin',
): Promise<{ repo: GitHubRepoRef | null; remoteUrl: string | null }> {
  const remoteUrl = await getRemoteUrl(directory, remoteName).catch(() => null);
  if (!remoteUrl) return { repo: null, remoteUrl: null };
  return { repo: parseGitHubRemoteUrl(remoteUrl), remoteUrl };
}

async function getRepoMetadata(
  octokit: Octokit,
  repo: GitHubRepoRef,
): Promise<Record<string, unknown> | null> {
  const repoKey = normalizeRepoKey(repo.owner, repo.repo);
  if (!repoKey) return null;

  const cached = repoMetadataCache.get(repoKey);
  if (cached && Date.now() - cached.fetchedAt < REPO_METADATA_TTL_MS) {
    return cached.data;
  }

  try {
    const response = await octokit.rest.repos.get({
      owner: repo.owner,
      repo: repo.repo,
    });
    const data = (response.data ?? null) as Record<string, unknown> | null;
    setRepoMetadataCache(repoKey, data);
    return data;
  } catch (error) {
    noteIfGitHubRateLimit(error);
    // 403/404 mean we simply cannot see this repo (private, renamed, or the
    // token lacks scope). That is an expected gap, not a hard failure.
    if (isResourceUnavailable(error)) {
      setRepoMetadataCache(repoKey, null);
      return null;
    }
    throw error;
  }
}

export function isResourceUnavailable(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return status === 403 || status === 404;
}

export function isAuthInvalid(error: unknown): boolean {
  const status = (error as { status?: number })?.status;
  return status === 401 || status === 403;
}

/**
 * Repos to consult for a directory, origin first. Returns null when the repo
 * is not a fork, so callers can skip network expansion entirely.
 */
export async function resolveRepoNetwork(
  octokit: Octokit,
  directory: string,
  remoteName = 'origin',
): Promise<RepoNetworkEntry[] | null> {
  const { repo } = await resolveGitHubRepoFromDirectory(
    directory,
    remoteName,
  ).catch(() => ({ repo: null }));
  if (!repo) return null;

  const metadata = await getRepoMetadata(octokit, repo);
  if (!metadata) return [{ ...repo, source: 'origin' }];

  const result: RepoNetworkEntry[] = [{ ...repo, source: 'origin' }];
  const seen = new Set([normalizeRepoKey(repo.owner, repo.repo)]);

  const pushUpstream = (candidate: unknown) => {
    const parent = candidate as
      | { owner?: { login?: string }; name?: string; html_url?: string }
      | null
      | undefined;
    const owner = normalizeText(parent?.owner?.login);
    const name = normalizeText(parent?.name);
    if (!owner || !name) return;
    const key = normalizeRepoKey(owner, name);
    if (seen.has(key)) return;
    seen.add(key);
    result.push({
      owner,
      repo: name,
      url:
        normalizeText(parent?.html_url) ||
        `https://github.com/${owner}/${name}`,
      source: 'upstream',
    });
  };

  pushUpstream(metadata.parent);
  pushUpstream(metadata.source);

  return result.length === 1 ? null : result;
}

/**
 * Resolves the repo an API caller asked for by explicit owner/repo, but only
 * if that repo is part of the directory's fork network. Without this check a
 * caller could point the server at an unrelated repository using a token that
 * can read it.
 */
export async function resolveRepoForRequest(
  octokit: Octokit,
  directory: string,
  requested: { owner: string; repo: string } | null,
): Promise<{ owner: string; repo: string } | null> {
  const { repo } = await resolveGitHubRepoFromDirectory(directory);
  if (!requested) return repo ? { owner: repo.owner, repo: repo.repo } : null;
  if (repo?.owner === requested.owner && repo.repo === requested.repo) {
    return requested;
  }

  const network = await resolveRepoNetwork(octokit, directory).catch(
    () => null,
  );
  const allowed = Array.isArray(network)
    ? network.some(
        (item) =>
          item.owner === requested.owner && item.repo === requested.repo,
      )
    : false;
  return allowed ? requested : null;
}

/** Throws when `directory` is not a usable checkout. */
export async function assertGitDirectory(directory: string): Promise<string> {
  return resolveGitDir(directory);
}
