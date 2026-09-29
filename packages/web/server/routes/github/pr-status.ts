// github/pr-status.ts
//
// Resolves which pull request (if any) belongs to a local branch.
//
// The hard part is not the lookup but deciding *where* to look: a branch can
// push to a fork, target an upstream, and sit in a checkout that also carries
// contributor remotes. An open PR from any candidate repo must win over a
// closed/merged one, otherwise a merged fork PR hides a live upstream PR.

import { stat } from 'node:fs/promises';
import type { Octokit } from '@octokit/rest';

import {
  getRemotes,
  getTrackingBranch,
  isAncestorOfHead,
} from '@/server/routes/git/service';

import { noteIfGitHubRateLimit } from './rate-limit';
import {
  type GitHubRepoRef,
  isResourceUnavailable,
  normalizeRepoKey,
  normalizeText,
  resolveGitHubRepoFromDirectory,
  resolveRepoNetwork,
} from './repo';

const REPO_DEFAULT_BRANCH_TTL_MS = 5 * 60_000;
const defaultBranchCache = new Map<
  string,
  { defaultBranch: string | null; fetchedAt: number }
>();

const REPO_PULLS_CACHE_TTL_MS = 45_000;
interface RepoPullsEntry {
  fetchedAt: number;
  prs: unknown[];
  complete: boolean;
}
const repoPullsCache = new Map<
  string,
  { entry: RepoPullsEntry; promise: Promise<RepoPullsEntry> }
>();

// Remembered answer to "what is the newest closed/merged PR for this head?".
// A found record barely changes — it would take a second PR on the same head,
// and while that one is open the open-PR path wins without reading this cache.
// "No history yet" is volatile, since merging elsewhere flips it, so it expires
// far sooner.
const HISTORICAL_PR_FOUND_TTL_MS = 6 * 60 * 60 * 1000;
const HISTORICAL_PR_ABSENT_TTL_MS = 10 * 60 * 1000;
const HISTORICAL_PR_CACHE_MAX_ENTRIES = 500;
const historicalPrCache = new Map<string, { pr: unknown; fetchedAt: number }>();

// The Search API has its own tiny quota (30/min). A branch with no PR would
// otherwise re-search on every poll.
const SEARCH_API_RETRY_MS = 5 * 60 * 1000;
const SEARCH_MISS_RETRY_MS = 10 * 60 * 1000;
const SEARCH_MISS_CACHE_MAX_ENTRIES = 500;
const searchMissCache = new Map<string, number>();
const searchApiDisabledRepos = new Map<string, number>();

type PullListItem = {
  number: number;
  state?: string;
  merged_at?: string | null;
  head?: { ref?: string; sha?: string; label?: string };
};

export interface ResolvedPrTarget {
  /** The repo the branch is associated with, or null when no remote is a GitHub repo. */
  repo: GitHubRepoRef | null;
  pr: PullListItem | null;
  defaultBranch: string | null;
  resolvedRemoteName: string | null;
}

async function directoryExists(dir: string): Promise<boolean> {
  if (!dir) return false;
  try {
    await stat(dir);
    return true;
  } catch {
    return false;
  }
}

async function getRepoDefaultBranch(
  octokit: Octokit,
  repo: GitHubRepoRef,
): Promise<string | null> {
  const repoKey = normalizeRepoKey(repo.owner, repo.repo);
  if (!repoKey) return null;

  const cached = defaultBranchCache.get(repoKey);
  if (cached && Date.now() - cached.fetchedAt < REPO_DEFAULT_BRANCH_TTL_MS) {
    return cached.defaultBranch;
  }

  try {
    const response = await octokit.rest.repos.get({
      owner: repo.owner,
      repo: repo.repo,
    });
    const defaultBranch = normalizeText(response.data?.default_branch) || null;
    defaultBranchCache.set(repoKey, { defaultBranch, fetchedAt: Date.now() });
    return defaultBranch;
  } catch (error) {
    noteIfGitHubRateLimit(error);
    return null;
  }
}

/**
 * Repos.list pulls every open PR for a repo, so one call per repo per state
 * answers the question for all of its branches. Ten worktree branches of one
 * repo should not mean ten `pulls.list` calls. In-flight requests coalesce so
 * concurrent branch resolutions share a single GitHub call.
 */
function getRepoPulls(
  octokit: Octokit,
  repo: GitHubRepoRef,
  state: 'open' | 'all',
  { force = false }: { force?: boolean } = {},
): Promise<RepoPullsEntry> {
  const key = `${repo.owner}/${repo.repo}::${state}`;
  const cached = repoPullsCache.get(key);
  if (cached) {
    // A shared in-flight request is always reused: coalescing concurrent branch
    // resolutions matters more than the `force` flag on a call already running.
    if (cached.promise) return cached.promise;
    if (
      !force &&
      Date.now() - cached.entry.fetchedAt < REPO_PULLS_CACHE_TTL_MS
    ) {
      return Promise.resolve(cached.entry);
    }
  }

  const promise = safeListPulls(octokit, {
    owner: repo.owner,
    repo: repo.repo,
    state,
    per_page: 100,
  })
    .then((prs) => {
      // `complete` means the first page held everything, so a miss is
      // authoritative: this repo has no PR in this state for any branch.
      const entry: RepoPullsEntry = {
        fetchedAt: Date.now(),
        prs: prs as unknown[],
        complete: prs.length < 100,
      };
      repoPullsCache.set(key, { entry, promise });
      return entry;
    })
    .catch((error) => {
      repoPullsCache.delete(key);
      throw error;
    });

  repoPullsCache.set(key, {
    entry: { fetchedAt: 0, prs: [], complete: false },
    promise,
  });
  return promise;
}

async function safeListPulls(
  octokit: Octokit,
  options: Parameters<Octokit['rest']['pulls']['list']>[0],
): Promise<PullListItem[]> {
  try {
    const response = await octokit.rest.pulls.list(options);
    return Array.isArray(response.data) ? response.data : [];
  } catch (error) {
    noteIfGitHubRateLimit(error);
    // 403/404 here means the repo is invisible to this token. Treat it as "no
    // PRs" rather than failing the whole branch resolution.
    if (isResourceUnavailable(error)) return [];
    throw error;
  }
}

function rememberHistoricalPr(key: string, pr: unknown): void {
  historicalPrCache.delete(key);
  historicalPrCache.set(key, { pr, fetchedAt: Date.now() });
  if (historicalPrCache.size > HISTORICAL_PR_CACHE_MAX_ENTRIES) {
    const oldest = historicalPrCache.keys().next().value;
    if (oldest !== undefined) historicalPrCache.delete(oldest);
  }
}

function isHistoricalPrCacheFresh(
  entry: { pr: unknown; fetchedAt: number } | undefined,
): boolean {
  if (!entry) return false;
  const ttl = entry.pr
    ? HISTORICAL_PR_FOUND_TTL_MS
    : HISTORICAL_PR_ABSENT_TTL_MS;
  return Date.now() - entry.fetchedAt < ttl;
}

/**
 * Drops cached PR lists and remembered history for a repo. Called after any
 * create/merge/close so the next read reflects the write immediately.
 */
export function invalidateRepoPullsCache(owner: string, repo: string): void {
  const prefix = `${normalizeText(owner)}/${normalizeText(repo)}::`;
  for (const key of repoPullsCache.keys()) {
    if (key.startsWith(prefix)) repoPullsCache.delete(key);
  }

  const repoNameLower = normalizeText(repo).toLowerCase();
  for (const key of searchMissCache.keys()) {
    const [repoPart] = key.split('::');
    if (repoPart && repoPart.split(',').includes(repoNameLower)) {
      searchMissCache.delete(key);
    }
  }

  const historicalPrefix = `${normalizeRepoKey(owner, repo)}::`;
  for (const key of historicalPrCache.keys()) {
    if (key.startsWith(historicalPrefix)) historicalPrCache.delete(key);
  }
}

function parseRepoFromApiUrl(
  value: unknown,
): { owner: string; repo: string } | null {
  const normalized = normalizeText(value);
  if (!normalized) return null;
  try {
    const url = new URL(normalized);
    const parts = url.pathname.replace(/^\/+/, '').split('/').filter(Boolean);
    if (parts.length < 2 || parts[0] !== 'repos') return null;
    const owner = parts[1];
    const repo = parts[2];
    if (!owner || !repo) return null;
    return { owner, repo };
  } catch {
    return null;
  }
}

function rememberSearchMiss(key: string): void {
  searchMissCache.delete(key);
  searchMissCache.set(key, Date.now());
  if (searchMissCache.size > SEARCH_MISS_CACHE_MAX_ENTRIES) {
    const oldest = searchMissCache.keys().next().value;
    if (oldest !== undefined) searchMissCache.delete(oldest);
  }
}

async function searchFallbackPr({
  octokit,
  branch,
  repoNames,
}: {
  octokit: Octokit;
  branch: string;
  repoNames: string[];
}): Promise<{ repo: GitHubRepoRef; pr: PullListItem } | null> {
  const repoKey = [...repoNames].sort().join(',').toLowerCase();

  const disabledAt = searchApiDisabledRepos.get(repoKey);
  if (disabledAt && Date.now() - disabledAt < SEARCH_API_RETRY_MS) return null;

  const missKey = `${repoKey}::${normalizeText(branch)}`;
  const missedAt = searchMissCache.get(missKey);
  if (missedAt && Date.now() - missedAt < SEARCH_MISS_RETRY_MS) return null;

  const normalizedRepoNames = new Set(
    repoNames.map((name) => name.trim().toLowerCase()).filter(Boolean),
  );

  let response: Awaited<
    ReturnType<Octokit['rest']['search']['issuesAndPullRequests']>
  >;
  try {
    response = await octokit.rest.search.issuesAndPullRequests({
      q: `is:pr state:open head:${branch}`,
      per_page: 20,
    });
    searchApiDisabledRepos.delete(repoKey);
  } catch (error) {
    noteIfGitHubRateLimit(error);
    const status = (error as { status?: number })?.status;
    if (status === 403) {
      // Token lacks search scope for this org. Back off instead of retrying.
      searchApiDisabledRepos.set(repoKey, Date.now());
      return null;
    }
    if (status === 404) {
      rememberSearchMiss(missKey);
      return null;
    }
    throw error;
  }

  const items = Array.isArray(response.data?.items) ? response.data.items : [];
  for (const item of items) {
    if (!item) continue;
    const repo = parseRepoFromApiUrl(item.repository_url);
    if (!repo) continue;
    if (
      normalizedRepoNames.size > 0 &&
      !normalizedRepoNames.has(repo.repo.toLowerCase())
    ) {
      continue;
    }

    try {
      const prResponse = await octokit.rest.pulls.get({
        owner: repo.owner,
        repo: repo.repo,
        pull_number: item.number,
      });
      const pr = prResponse?.data as PullListItem | undefined;
      if (!pr || normalizeText(pr.head?.ref) !== branch) continue;
      return {
        repo: {
          owner: repo.owner,
          repo: repo.repo,
          url: `https://github.com/${repo.owner}/${repo.repo}`,
        },
        pr,
      };
    } catch (error) {
      if (isResourceUnavailable(error)) continue;
      throw error;
    }
  }

  rememberSearchMiss(missKey);
  return null;
}

function isTerminalPr(pr: PullListItem | null): boolean {
  if (!pr) return false;
  return pr.state === 'closed' || Boolean(pr.merged_at);
}

function getHeadOwner(pr: PullListItem): string {
  const label = normalizeText(pr?.head?.label);
  const separatorIndex = label.indexOf(':');
  if (separatorIndex > 0) return label.slice(0, separatorIndex).trim();
  return '';
}

/**
 * Ranks candidate PRs by how closely their head repo matches the repos this
 * branch actually pushes to, so `yourfork:branch` beats an unrelated
 * `otherfork:branch` that merely shares a branch name.
 */
function buildSourceMatcher(sourceCandidates: GitHubRepoRef[]) {
  const repoRank = new Map<string, number>();
  const ownerRank = new Map<string, number>();

  sourceCandidates.forEach((candidate, index) => {
    const key = normalizeRepoKey(candidate.owner, candidate.repo);
    if (key && !repoRank.has(key)) repoRank.set(key, index);
    const owner = candidate.owner.trim().toLowerCase();
    if (owner && !ownerRank.has(owner)) ownerRank.set(owner, index);
  });

  const matches = (pr: PullListItem, fallbackRepoName: string): boolean => {
    const label = normalizeText(pr?.head?.label);
    const separatorIndex = label.indexOf(':');
    const labelOwner =
      separatorIndex > 0 ? label.slice(0, separatorIndex).trim() : '';
    const key =
      labelOwner && fallbackRepoName
        ? normalizeRepoKey(labelOwner, fallbackRepoName)
        : '';
    if (key && repoRank.has(key)) return true;
    const owner = getHeadOwner(pr).toLowerCase();
    return Boolean(owner) && ownerRank.has(owner);
  };

  const rank = (pr: PullListItem, fallbackRepoName: string): number => {
    const label = normalizeText(pr?.head?.label);
    const separatorIndex = label.indexOf(':');
    const labelOwner =
      separatorIndex > 0 ? label.slice(0, separatorIndex).trim() : '';
    const key =
      labelOwner && fallbackRepoName
        ? normalizeRepoKey(labelOwner, fallbackRepoName)
        : '';
    const repoScore = repoRank.get(key) ?? Number.POSITIVE_INFINITY;
    const ownerScore =
      ownerRank.get(getHeadOwner(pr).toLowerCase()) ?? Number.POSITIVE_INFINITY;
    return Math.min(repoScore, ownerScore);
  };

  return { matches, rank };
}

interface BranchPrCandidates {
  open: PullListItem | null;
  historical: PullListItem | null;
}

/**
 * `open` is live branch status; `historical` is the last closed/merged PR for
 * the same head. The caller must prefer an open PR from ANY target over a
 * historical one.
 *
 * `includeHistory` is off by default and must stay that way for secondary
 * targets: live status is worth searching the whole fork network, history is
 * not, and doing it per target multiplies serial GitHub calls until the route
 * hits its resolve timeout.
 */
async function findBranchPrCandidates({
  octokit,
  target,
  branch,
  sourceCandidates,
  force = false,
  coverage,
  includeHistory = false,
}: {
  octokit: Octokit;
  target: GitHubRepoRef;
  branch: string;
  sourceCandidates: GitHubRepoRef[];
  force?: boolean;
  coverage: { authoritative: boolean };
  includeHistory?: boolean;
}): Promise<BranchPrCandidates> {
  const matcher = buildSourceMatcher(sourceCandidates);
  const sourceOwners: string[] = [];
  for (const candidate of sourceCandidates) {
    const owner = normalizeText(candidate.owner);
    if (owner && !sourceOwners.includes(owner)) sourceOwners.push(owner);
  }

  const pickPreferred = (prs: PullListItem[]): PullListItem | null =>
    prs
      .filter((pr) => normalizeText(pr.head?.ref) === branch)
      .filter((pr) => matcher.matches(pr, target.repo))
      .sort(
        (left, right) =>
          matcher.rank(left, target.repo) - matcher.rank(right, target.repo),
      )[0] ?? null;

  let openListWasComplete = false;
  try {
    const listEntry = await getRepoPulls(octokit, target, 'open', { force });
    const fromList = pickPreferred(listEntry.prs as PullListItem[]);
    if (fromList) return { open: fromList, historical: null };
    openListWasComplete = listEntry.complete;
  } catch {
    // fall through to the precise per-head queries
  }

  if (!openListWasComplete && coverage) coverage.authoritative = false;

  if (openListWasComplete && !includeHistory) {
    return { open: null, historical: null };
  }

  const historicalKey = `${normalizeRepoKey(target.owner, target.repo)}::${branch}`;
  if (includeHistory && !force && openListWasComplete) {
    const cached = historicalPrCache.get(historicalKey);
    if (isHistoricalPrCacheFresh(cached)) {
      return { open: null, historical: (cached?.pr as PullListItem) ?? null };
    }
  }

  // One query per source owner. With history enabled `state: 'all'` answers
  // both questions at once, so asking for history never costs an extra call.
  let historical: PullListItem | null = null;
  for (const owner of sourceOwners) {
    const directCandidates = await safeListPulls(octokit, {
      owner: target.owner,
      repo: target.repo,
      state: includeHistory ? 'all' : 'open',
      head: `${owner}:${branch}`,
      per_page: 100,
    });

    const openMatch = pickPreferred(
      directCandidates.filter((pr) => !isTerminalPr(pr)),
    );
    if (openMatch) return { open: openMatch, historical: null };

    if (includeHistory && !historical) {
      // Among past PRs for the same head, the newest is the relevant record.
      historical =
        directCandidates
          .filter((pr) => normalizeText(pr.head?.ref) === branch)
          .filter((pr) => matcher.matches(pr, target.repo))
          .filter(isTerminalPr)
          .sort((left, right) => (right.number ?? 0) - (left.number ?? 0))[0] ??
        null;
    }
  }

  if (includeHistory) rememberHistoricalPr(historicalKey, historical);
  return { open: null, historical };
}

/**
 * A closed/merged PR is matched by head branch NAME, and names get reused: a
 * fresh worktree called `feature` cut from the default branch would inherit the
 * merged PR of last month's `feature`. The PR belongs to this checkout only
 * when the commit it was merged at is part of the checkout's history.
 */
export async function isHistoricalPrOfCheckout(
  directory: string,
  pr: PullListItem,
): Promise<boolean> {
  const headSha = normalizeText(pr?.head?.sha);
  if (!headSha) return false;
  try {
    return await isAncestorOfHead(directory, headSha);
  } catch {
    return false;
  }
}

function parseTrackingRemoteName(trackingBranch: string | null): string {
  const normalized = normalizeText(trackingBranch);
  if (!normalized) return '';
  const slashIndex = normalized.indexOf('/');
  if (slashIndex <= 0) return '';
  return normalized.slice(0, slashIndex).trim();
}

function parseTrackingBranchName(trackingBranch: string | null): string {
  const normalized = normalizeText(trackingBranch);
  if (!normalized) return '';
  const slashIndex = normalized.indexOf('/');
  if (slashIndex <= 0 || slashIndex >= normalized.length - 1) return '';
  return normalized.slice(slashIndex + 1).trim();
}

function pushUnique(collection: string[], value: unknown): void {
  const normalized = normalizeText(value);
  if (!normalized) return;
  if (
    collection.some((item) => item.toLowerCase() === normalized.toLowerCase())
  ) {
    return;
  }
  collection.push(normalized);
}

function rankRemoteNames(
  remoteNames: string[],
  explicitRemoteName: string,
  trackingRemoteName: string,
): string[] {
  const ranked: string[] = [];
  pushUnique(ranked, explicitRemoteName);
  if (trackingRemoteName) pushUnique(ranked, trackingRemoteName);
  pushUnique(ranked, 'origin');
  pushUnique(ranked, 'upstream');
  for (const name of remoteNames) pushUnique(ranked, name);
  return ranked;
}

export async function resolveGitHubPrStatus({
  octokit,
  directory,
  branch,
  remoteName,
  force = false,
}: {
  octokit: Octokit;
  directory: string;
  branch: string;
  remoteName?: string;
  force?: boolean;
}): Promise<ResolvedPrTarget> {
  // A deleted worktree can still have a session in the sidebar polling for its
  // PR. Bail before touching git or GitHub for a path that's gone.
  if (!(await directoryExists(directory))) {
    return {
      repo: null,
      pr: null,
      defaultBranch: null,
      resolvedRemoteName: null,
    };
  }

  const normalizedBranch = normalizeText(branch);
  const normalizedRemoteName = normalizeText(remoteName) || 'origin';

  const [tracking, remotes] = await Promise.all([
    getTrackingBranch(directory).catch(() => null),
    getRemotes(directory).catch(() => []),
  ]);

  const rankedRemoteNames = rankRemoteNames(
    Array.isArray(remotes)
      ? remotes.map((remote) => remote?.name).filter(Boolean)
      : [],
    normalizedRemoteName,
    parseTrackingRemoteName(tracking),
  );

  // Resolve every ranked remote concurrently — they're independent git
  // lookups — then dedup in rank order.
  const resolvedRemotes = await Promise.all(
    rankedRemoteNames.map((name) =>
      resolveGitHubRepoFromDirectory(directory, name)
        .then((resolved) => ({ remoteName: name, repo: resolved.repo }))
        .catch(() => ({ remoteName: name, repo: null })),
    ),
  );

  const localTargets: Array<{ remoteName: string; repo: GitHubRepoRef }> = [];
  const seenRepoKeys = new Set<string>();
  for (const { remoteName, repo } of resolvedRemotes) {
    const repoKey = normalizeRepoKey(repo?.owner, repo?.repo);
    if (!repo || !repoKey || seenRepoKeys.has(repoKey)) continue;
    seenRepoKeys.add(repoKey);
    localTargets.push({ remoteName, repo });
  }

  if (localTargets.length === 0) {
    return {
      repo: null,
      pr: null,
      defaultBranch: null,
      resolvedRemoteName: null,
    };
  }

  // Expand each local target through its fork network so an upstream PR can be
  // found from a fork checkout.
  const targets: Array<{
    remoteName: string;
    repo: GitHubRepoRef;
    priority: number;
  }> = [];
  const expandedSeen = new Set<string>();
  localTargets.forEach((target, index) => {
    const push = (repo: GitHubRepoRef, priority: number) => {
      const key = normalizeRepoKey(repo.owner, repo.repo);
      if (!key || expandedSeen.has(key)) return;
      expandedSeen.add(key);
      targets.push({ remoteName: target.remoteName, repo, priority });
    };
    push(target.repo, index);
  });

  for (const target of localTargets) {
    const network = await resolveRepoNetwork(
      octokit,
      directory,
      target.remoteName,
    ).catch(() => null);
    if (!network) continue;
    const basePriority = localTargets.indexOf(target);
    for (const entry of network) {
      const key = normalizeRepoKey(entry.owner, entry.repo);
      if (!key || expandedSeen.has(key)) continue;
      expandedSeen.add(key);
      targets.push({
        remoteName: target.remoteName,
        repo: { owner: entry.owner, repo: entry.repo, url: entry.url },
        priority: basePriority + (entry.source === 'upstream' ? 0.1 : 0),
      });
    }
  }

  targets.sort((left, right) => left.priority - right.priority);

  // Only the repo this branch actually pushes to (the ranked-first remote) and
  // its fork network can be the SOURCE of the branch's PRs. Other configured
  // remotes — a maintainer's checkout often carries contributor forks — are
  // places to look for an open PR, but their `owner:branch` heads are
  // unrelated branches that merely share a name.
  const primaryRemoteName = targets[0]?.remoteName ?? null;
  const sourceCandidates = targets
    .filter((target) => target.remoteName === primaryRemoteName)
    .map((target) => target.repo);

  const branchCandidates: string[] = [];
  pushUnique(branchCandidates, normalizedBranch);
  pushUnique(branchCandidates, parseTrackingBranchName(tracking));

  // When every consulted repo list was complete, a no-PR result is
  // authoritative and the expensive Search API fallback is pointless.
  const coverage = { authoritative: true };

  const fallbackRepo = targets[0].repo;
  const fallbackRemoteName = targets[0].remoteName;
  const fallbackDefaultBranch = await getRepoDefaultBranch(
    octokit,
    fallbackRepo,
  );

  // First closed/merged PR found, in target priority order. Returned only once
  // every target has been checked for an open PR.
  let historicalMatch: ResolvedPrTarget | null = null;

  for (const target of targets) {
    const defaultBranch = await getRepoDefaultBranch(octokit, target.repo);

    const hasCrossRepoSource = sourceCandidates.some(
      (candidate) =>
        normalizeRepoKey(candidate.owner, candidate.repo) !==
        normalizeRepoKey(target.repo.owner, target.repo.repo),
    );

    for (const candidateBranch of branchCandidates) {
      if (
        defaultBranch &&
        defaultBranch === candidateBranch &&
        !hasCrossRepoSource
      ) {
        continue;
      }

      // History is only asked of the branch's own repo and its own name: the
      // ranked-first target is the remote this branch actually pushes to.
      const isPrimaryAssociation =
        target === targets[0] && candidateBranch === branchCandidates[0];

      const { open, historical } = await findBranchPrCandidates({
        octokit,
        target: target.repo,
        branch: candidateBranch,
        sourceCandidates,
        force,
        coverage,
        includeHistory: isPrimaryAssociation,
      });

      if (open) {
        return {
          repo: target.repo,
          pr: open,
          defaultBranch,
          resolvedRemoteName: target.remoteName,
        };
      }
      if (historical && !historicalMatch) {
        historicalMatch = {
          repo: target.repo,
          pr: historical,
          defaultBranch,
          resolvedRemoteName: target.remoteName,
        };
      }
    }
  }

  for (const candidateBranch of branchCandidates) {
    if (coverage.authoritative) break;
    const fallbackSearch = await searchFallbackPr({
      octokit,
      branch: candidateBranch,
      repoNames: targets.map((target) => target.repo.repo),
    });
    if (fallbackSearch) {
      return {
        repo: fallbackSearch.repo,
        pr: fallbackSearch.pr,
        defaultBranch: await getRepoDefaultBranch(octokit, fallbackSearch.repo),
        resolvedRemoteName: null,
      };
    }
  }

  if (
    historicalMatch &&
    (await isHistoricalPrOfCheckout(directory, historicalMatch.pr!))
  ) {
    return historicalMatch;
  }

  return {
    repo: fallbackRepo,
    pr: null,
    defaultBranch: fallbackDefaultBranch,
    resolvedRemoteName: fallbackRemoteName,
  };
}
