// github/service.ts
//
// Shared GitHub service layer: zod request schemas, the user summary helper,
// check-run detail fetching, and the response shapes the routes return.

import type { Octokit } from '@octokit/rest';
import { z } from 'zod';
import type { GitHubUser } from './auth';
import {
  type CheckRunSummary,
  dedupeCheckRuns,
  summarizeCheckRuns,
} from './checks';
import { noteIfGitHubRateLimit } from './rate-limit';
import { isResourceUnavailable, normalizeText } from './repo';

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
// Zod schemas
// ---------------------------------------------------------------------------

export const githubDirectorySchema = z.string().min(1);

const booleanFromQuery = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((value) => value === true || value === 'true' || value === '1');

export const githubDeviceFlowStartBodySchema = z.object({});
export const githubDeviceFlowCompleteBodySchema = z.object({
  deviceCode: z.string().min(1),
});
export const githubActivateBodySchema = z.object({
  accountId: z.string().min(1),
});
export const githubGhCliBodySchema = z.object({
  disabled: z.boolean(),
});

export const githubPrStatusQuerySchema = z.object({
  directory: githubDirectorySchema,
  branch: z.string().min(1),
  remote: z.string().optional(),
  force: booleanFromQuery.optional().default(false),
});

export const githubPrCreateBodySchema = z.object({
  directory: githubDirectorySchema,
  title: z.string().min(1),
  head: z.string().min(1),
  base: z.string().min(1),
  body: z.string().optional(),
  draft: z.boolean().optional(),
  /** Target repo, e.g. `upstream` for a fork PR. */
  remote: z.string().optional().default('origin'),
  /** Repo the head branch lives on, when it differs from the target. */
  headRemote: z.string().optional(),
  /** Explicit target, used when upstream was auto-detected. */
  targetRepo: z
    .object({ owner: z.string().min(1), repo: z.string().min(1) })
    .optional(),
});

export const githubPrNumberBodySchema = z.object({
  directory: githubDirectorySchema,
  number: z.number().int().positive(),
});

export const githubPrUpdateBodySchema = githubPrNumberBodySchema.extend({
  title: z.string().min(1),
  body: z.string().optional(),
});

export const githubPrMergeBodySchema = githubPrNumberBodySchema.extend({
  method: z.enum(['merge', 'squash', 'rebase']).optional().default('merge'),
});

export const githubPrDescribeBodySchema = z.object({
  directory: githubDirectorySchema,
  base: z.string().optional(),
  head: z.string().optional(),
  model: z
    .object({ providerId: z.string().min(1), modelId: z.string().min(1) })
    .optional(),
});

export const githubUpstreamQuerySchema = z.object({
  directory: githubDirectorySchema,
});

export const githubBranchesQuerySchema = z.object({
  owner: z.string().min(1),
  repo: z.string().min(1),
});

export const githubRepoListQuerySchema = z.object({
  directory: githubDirectorySchema,
  page: z.coerce.number().int().positive().optional().default(1),
  query: z.string().optional(),
});

export const githubRepoItemQuerySchema = z.object({
  directory: githubDirectorySchema,
  number: z.coerce.number().int().positive(),
  owner: z.string().optional(),
  repo: z.string().optional(),
  diff: booleanFromQuery.optional().default(false),
  checkDetails: booleanFromQuery.optional().default(false),
});

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

/** The authenticated user, with email resolved from the verified list. */
export async function getGitHubUserSummary(
  octokit: Octokit,
): Promise<GitHubUser> {
  const me = await octokit.rest.users.getAuthenticated();

  let email = normalizeText(me.data.email) || null;
  if (!email) {
    // `users.getAuthenticated` returns null email when the profile keeps it
    // private, but the token can still read the address list.
    try {
      const emails = await octokit.rest.users.listEmailsForAuthenticatedUser({
        per_page: 100,
      });
      const list = Array.isArray(emails?.data) ? emails.data : [];
      const primaryVerified = list.find(
        (entry) => entry?.primary && entry?.verified && entry?.email,
      );
      const anyVerified = list.find((entry) => entry?.verified && entry?.email);
      email = primaryVerified?.email || anyVerified?.email || null;
    } catch {
      // Scope may be missing; the rest of the summary is still useful.
    }
  }

  return {
    login: me.data.login,
    id: me.data.id,
    avatarUrl: me.data.avatar_url,
    name: typeof me.data.name === 'string' ? me.data.name : null,
    email,
  };
}

export interface RepoRefResponse {
  owner: string;
  repo: string;
}

export interface AuthorResponse {
  login: string;
  id: number;
  avatarUrl: string;
}

export function mapAuthor(user: unknown): AuthorResponse | null {
  const entry = user as
    | { login?: string; id?: number; avatar_url?: string }
    | null
    | undefined;
  if (!entry || typeof entry.login !== 'string' || !entry.login) return null;
  return {
    login: entry.login,
    id: entry.id ?? 0,
    avatarUrl: normalizeText(entry.avatar_url),
  };
}

export function mapLabel(
  label: unknown,
): { name: string; color?: string } | null {
  if (typeof label === 'string') return null;
  const entry = label as { name?: string; color?: string } | null | undefined;
  const name = normalizeText(entry?.name);
  if (!name) return null;
  const color = typeof entry?.color === 'string' ? entry.color : undefined;
  return color ? { name, color } : { name };
}

export function mapLabels(
  labels: unknown,
): Array<{ name: string; color?: string }> {
  if (!Array.isArray(labels)) return [];
  return labels
    .map(mapLabel)
    .filter(
      (label): label is { name: string; color?: string } => label !== null,
    );
}

export type PullRequestState = 'open' | 'closed' | 'merged';

export function resolvePullRequestState(pr: {
  state?: string;
  merged?: boolean;
  merged_at?: string | null;
}): PullRequestState {
  if (pr.merged || pr.merged_at) return 'merged';
  return pr.state === 'closed' ? 'closed' : 'open';
}

export interface HeadRepoResponse {
  owner: string;
  repo: string;
  url: string;
  cloneUrl: string;
  sshUrl: string;
}

/**
 * Null when the head repo is missing or deleted, which is what a PR from a
 * deleted fork looks like.
 */
export function mapHeadRepo(pr: {
  head?: { repo?: unknown } | null;
}): HeadRepoResponse | null {
  const repo = pr.head?.repo as
    | {
        name?: string;
        html_url?: string;
        clone_url?: string;
        ssh_url?: string;
        owner?: { login?: string };
      }
    | null
    | undefined;
  const owner = normalizeText(repo?.owner?.login);
  const name = normalizeText(repo?.name);
  const url = normalizeText(repo?.html_url);
  if (!owner || !name || !url) return null;
  return {
    owner,
    repo: name,
    url,
    cloneUrl: normalizeText(repo?.clone_url),
    sshUrl: normalizeText(repo?.ssh_url),
  };
}

// ---------------------------------------------------------------------------
// Check run details
// ---------------------------------------------------------------------------

export interface CheckRunStep {
  name: string;
  status?: string;
  conclusion?: string | null;
  number?: number;
  startedAt?: string;
  completedAt?: string;
}

export interface CheckRunJob {
  runId: number;
  jobId?: number;
  url?: string;
  name?: string;
  workflowName?: string;
  conclusion?: string | null;
  steps?: CheckRunStep[];
}

export interface CheckRunAnnotation {
  path?: string;
  startLine?: number;
  endLine?: number;
  level?: string;
  message: string;
  title?: string;
  rawDetails?: string;
}

export interface CheckRunDetail {
  id: number;
  name: string;
  startedAt?: string;
  completedAt?: string;
  app?: { name?: string; slug?: string };
  status: string;
  conclusion: string | null;
  detailsUrl?: string;
  output?: { title?: string; summary?: string; text?: string };
  job?: CheckRunJob;
  annotations?: CheckRunAnnotation[];
}

interface RawCheckRun {
  id?: number;
  name?: string;
  status?: string;
  conclusion?: string | null;
  started_at?: string;
  completed_at?: string;
  details_url?: string;
  app?: { id?: number; slug?: string; name?: string };
  output?: { title?: string; summary?: string; text?: string };
}

interface RawAnnotation {
  path?: string;
  start_line?: number;
  end_line?: number;
  annotation_level?: string | null;
  message?: string | null;
  title?: string | null;
  raw_details?: string | null;
}

function parseRunId(detailsUrl: string | undefined): {
  runId: number;
  jobId?: number;
} | null {
  if (!detailsUrl) return null;
  const match = detailsUrl.match(/\/actions\/runs\/(\d+)(?:\/job\/(\d+))?/);
  if (!match) return null;
  return {
    runId: Number(match[1]),
    jobId: match[2] ? Number(match[2]) : undefined,
  };
}

function mapStep(
  step: NonNullable<
    NonNullable<
      Awaited<
        ReturnType<Octokit['rest']['actions']['listJobsForWorkflowRun']>
      >['data']['jobs'][number]['steps']
    >
  >[number],
): CheckRunStep {
  return {
    name: step.name ?? '',
    status: step.status,
    conclusion: step.conclusion ?? null,
    number: step.number,
    startedAt: step.started_at || undefined,
    completedAt: step.completed_at || undefined,
  };
}

async function fetchJobForRun(
  octokit: Octokit,
  repo: RepoRefResponse,
  run: RawCheckRun,
  parsed: { runId: number; jobId?: number },
): Promise<CheckRunJob> {
  const base: CheckRunJob = { runId: parsed.runId };

  try {
    const response = await octokit.rest.actions.listJobsForWorkflowRun({
      owner: repo.owner,
      repo: repo.repo,
      run_id: parsed.runId,
      per_page: 100,
    });
    const jobs = Array.isArray(response?.data?.jobs) ? response.data.jobs : [];

    // The run's details_url points at a specific job when one exists; fall back
    // to a name match, then to a bare stub so the UI can still link out.
    const picked =
      (parsed.jobId
        ? jobs.find((job) => job.id === parsed.jobId)
        : undefined) ??
      jobs.find((job) => job.name === run.name) ??
      null;

    if (!picked) {
      return {
        ...base,
        ...(parsed.jobId ? { jobId: parsed.jobId } : {}),
        url: run.details_url,
      };
    }

    return {
      ...base,
      jobId: picked.id,
      url: normalizeText(picked.html_url) || run.details_url,
      name: picked.name,
      workflowName: picked.workflow_name || undefined,
      conclusion: picked.conclusion ?? null,
      steps: Array.isArray(picked.steps)
        ? picked.steps.map(mapStep)
        : undefined,
    };
  } catch {
    return {
      ...base,
      ...(parsed.jobId ? { jobId: parsed.jobId } : {}),
      url: run.details_url,
    };
  }
}

async function fetchAnnotationsForRun(
  octokit: Octokit,
  repo: RepoRefResponse,
  runId: number,
): Promise<CheckRunAnnotation[]> {
  const collected: RawAnnotation[] = [];

  // Cap at three pages; beyond that a run has produced far more noise than
  // anyone reads in a side panel.
  for (let page = 1; page <= 3; page++) {
    let batch: RawAnnotation[];
    try {
      const response = await octokit.rest.checks.listAnnotations({
        owner: repo.owner,
        repo: repo.repo,
        check_run_id: runId,
        per_page: 50,
        page,
      });
      batch = Array.isArray(response?.data)
        ? (response.data as unknown as RawAnnotation[])
        : [];
    } catch {
      break;
    }
    collected.push(...batch);
    if (batch.length < 50) break;
  }

  return collected
    .filter((annotation) => Boolean(annotation?.message))
    .map((annotation) => ({
      path: annotation.path || undefined,
      startLine: annotation.start_line,
      endLine: annotation.end_line,
      level: annotation.annotation_level || undefined,
      message: String(annotation.message ?? ''),
      title: annotation.title || undefined,
      rawDetails: annotation.raw_details || undefined,
    }));
}

export interface CheckRunFetchResult {
  checks: CheckRunSummary | null;
  runs: CheckRunDetail[];
}

/**
 * Fetches the check aggregate for a SHA, and optionally the per-run detail
 * (job steps, failure annotations) the Checks tab renders.
 */
export async function fetchChecksForRef(
  octokit: Octokit,
  repo: RepoRefResponse,
  ref: string,
  { includeDetails = false }: { includeDetails?: boolean } = {},
): Promise<CheckRunFetchResult> {
  let rawRuns: RawCheckRun[] = [];

  try {
    const response = await octokit.rest.checks.listForRef({
      owner: repo.owner,
      repo: repo.repo,
      ref,
      per_page: 100,
    });
    rawRuns = dedupeCheckRuns(
      (Array.isArray(response?.data?.check_runs)
        ? response.data.check_runs
        : []) as RawCheckRun[],
    );
  } catch (error) {
    noteIfGitHubRateLimit(error);
    // Fall through to commit statuses below.
  }

  if (rawRuns.length === 0) {
    try {
      const combined = await octokit.rest.repos.getCombinedStatusForRef({
        owner: repo.owner,
        repo: repo.repo,
        ref,
      });
      const statuses = Array.isArray(combined?.data?.statuses)
        ? combined.data.statuses
        : [];
      const { summarizeCombinedStatuses } = await import('./checks');
      return { checks: summarizeCombinedStatuses(statuses), runs: [] };
    } catch (error) {
      noteIfGitHubRateLimit(error);
      return { checks: null, runs: [] };
    }
  }

  const checks = summarizeCheckRuns(rawRuns);

  if (!includeDetails) {
    return { checks, runs: rawRuns.map((run) => mapRunBasic(run)) };
  }

  const jobCache = new Map<number, CheckRunJob>();
  const annotationCache = new Map<number, CheckRunAnnotation[]>();

  const runs = await Promise.all(
    rawRuns.map(async (run) => {
      const detail: CheckRunDetail = mapRunBasic(run);
      if (typeof run.id !== 'number') return detail;

      const parsed = parseRunId(run.details_url);
      if (parsed) {
        if (!jobCache.has(parsed.runId)) {
          jobCache.set(
            parsed.runId,
            await fetchJobForRun(octokit, repo, run, parsed),
          );
        }
        detail.job = jobCache.get(parsed.runId);
      }

      const conclusion = (run.conclusion ?? '').toLowerCase();
      const failed =
        Boolean(conclusion) &&
        !['success', 'neutral', 'skipped'].includes(conclusion);
      if (failed && run.id > 0) {
        if (!annotationCache.has(run.id)) {
          annotationCache.set(
            run.id,
            await fetchAnnotationsForRun(octokit, repo, run.id),
          );
        }
        const annotations = annotationCache.get(run.id);
        if (annotations && annotations.length > 0) {
          detail.annotations = annotations;
        }
      }

      return detail;
    }),
  );

  return { checks, runs };
}

function mapRunBasic(run: RawCheckRun): CheckRunDetail {
  const output = run.output;
  const hasOutput =
    Boolean(output?.title) || Boolean(output?.summary) || Boolean(output?.text);

  return {
    id: run.id ?? 0,
    name: run.name ?? '',
    startedAt: run.started_at || undefined,
    completedAt: run.completed_at || undefined,
    app:
      run.app?.name || run.app?.slug
        ? { name: run.app.name, slug: run.app.slug ?? undefined }
        : undefined,
    status: run.status ?? 'unknown',
    conclusion: run.conclusion ?? null,
    detailsUrl: run.details_url || undefined,
    output: hasOutput
      ? {
          title: output?.title || undefined,
          summary: output?.summary || undefined,
          text: output?.text || undefined,
        }
      : undefined,
  };
}

/**
 * Fetches a repo's open PRs / issues, tolerating repos we cannot read.
 * `headers` is Octokit's `ResponseHeaders`, whose values may be `string |
 * number | undefined`, so the Link header is read defensively.
 */
export async function safeListForRepo<T>(
  list: () => Promise<{ data: T[]; headers?: unknown }>,
  label: string,
): Promise<{ items: T[]; hasMore: boolean }> {
  try {
    const response = await list();
    const link = normalizeText(
      (response?.headers as { link?: unknown } | undefined)?.link,
    );
    return {
      items: Array.isArray(response?.data) ? response.data : [],
      hasMore: /rel="next"/.test(link),
    };
  } catch (error) {
    if (isResourceUnavailable(error)) {
      return { items: [], hasMore: false };
    }
    console.warn(`[github] failed to list ${label}:`, error);
    return { items: [], hasMore: false };
  }
}

export function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  let timer: NodeJS.Timeout;
  const timeout = new Promise<never>((_resolve, reject) => {
    timer = setTimeout(() => {
      const error = new Error(
        `${label} timed out after ${timeoutMs}ms`,
      ) as Error & {
        code?: string;
      };
      error.code = 'ETIMEDOUT';
      reject(error);
    }, timeoutMs);
    if (typeof timer.unref === 'function') timer.unref();
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}
