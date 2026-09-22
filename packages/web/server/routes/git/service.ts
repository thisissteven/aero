import fs from 'node:fs';
import path from 'node:path';
import simpleGit, { type SimpleGit } from 'simple-git';
import { z } from 'zod';
import { DirectoryNotFoundError, InvalidGitRepositoryError } from './errors';

// ---------------------------------------------------------------------------
// Git client management
// ---------------------------------------------------------------------------

const gitOptions = { maxConcurrentProcesses: 1 };
const gitClients = new Map<string, SimpleGit>();

const repositoryValidationCache = new Map<
  string,
  { isRepo: boolean; expiresAt: number }
>();
const REPOSITORY_VALIDATION_TTL = 5_000;

function normalizePath(inputPath: string): string {
  return path.resolve(inputPath).replace(/\\/g, '/').replace(/\/$/, '');
}

export function getGitClient(directory: string): SimpleGit {
  const existing = gitClients.get(directory);
  if (existing) return existing;
  const client = simpleGit(directory, gitOptions);
  gitClients.set(directory, client);
  return client;
}

export async function resolveGitDir(inputPath: string): Promise<string> {
  const directory = normalizePath(inputPath);
  if (!fs.existsSync(directory)) throw new DirectoryNotFoundError(directory);
  const stat = fs.statSync(directory);
  if (!stat.isDirectory()) throw new DirectoryNotFoundError(directory);
  return directory;
}

export async function isGitRepository(directory: string): Promise<boolean> {
  const now = Date.now();
  const cached = repositoryValidationCache.get(directory);
  if (cached && cached.expiresAt > now) return cached.isRepo;
  const isRepo = await getGitClient(directory).checkIsRepo();
  repositoryValidationCache.set(directory, {
    isRepo,
    expiresAt: now + REPOSITORY_VALIDATION_TTL,
  });
  return isRepo;
}

export async function getGitDirectory(inputDirectory: string): Promise<string> {
  const directory = await resolveGitDir(inputDirectory);
  if (!(await isGitRepository(directory))) {
    throw new InvalidGitRepositoryError(directory);
  }
  return directory;
}

// ---------------------------------------------------------------------------
// Coercion helpers
// ---------------------------------------------------------------------------

/**
 * Query strings arrive as `string | string[] | undefined`.
 * `z.coerce.boolean()` treats the literal string "false" as truthy, so
 * we parse explicitly instead.
 */
const booleanFromQuery = z
  .union([z.boolean(), z.enum(['true', 'false', '1', '0'])])
  .transform((v) => v === true || v === 'true' || v === '1');

const optionalBooleanFromQuery = booleanFromQuery.optional().default(false);

// ---------------------------------------------------------------------------
// Zod schemas — query
// ---------------------------------------------------------------------------

export const gitDirectorySchema = z
  .string()
  .min(1, 'Directory path is required');

export const gitDirectoryQuerySchema = z.object({
  directory: gitDirectorySchema,
});

export const rangeDiffQuerySchema = z.object({
  directory: gitDirectorySchema,
  base: z.string().min(1),
  head: z.string().min(1),
  path: z.string().optional(),
  context: z.coerce.number().int().min(0).optional().default(3),
  includeWorkingTree: optionalBooleanFromQuery,
});

export const diffQuerySchema = z.object({
  directory: gitDirectorySchema,
  path: z.string().min(1),
  staged: optionalBooleanFromQuery,
  context: z.coerce.number().int().min(0).optional().default(3),
});

export const fileDiffQuerySchema = z.object({
  directory: gitDirectorySchema,
  path: z.string().min(1),
  staged: optionalBooleanFromQuery,
});

// ---------------------------------------------------------------------------
// Zod schemas — body
// ---------------------------------------------------------------------------

export const commitBodySchema = z.object({
  directory: gitDirectorySchema,
  message: z.string().min(1, 'Commit message is required'),
  files: z.array(z.string()).optional(),
  addAll: z.boolean().optional(),
  stageFiles: z.array(z.string()).optional(),
});

export const checkoutBodySchema = z.object({
  directory: gitDirectorySchema,
  target: z.string().min(1, 'Branch or commit target is required'),
  createBranch: z.boolean().optional(),
});

export const pullBodySchema = z.object({
  remote: z.string().optional(),
  branch: z.string().optional(),
  rebase: z.boolean().optional(),
});

export const pushBodySchema = z.object({
  remote: z.string().optional(),
  branch: z.string().optional(),
  force: z.boolean().optional(),
  setUpstream: z.boolean().optional(),
});

export const fetchBodySchema = z.object({
  remote: z.string().optional(),
  prune: z.boolean().optional(),
});

export const stashPushBodySchema = z.object({
  message: z.string().optional(),
});

export const stashRefBodySchema = z.object({
  ref: z.string().optional(),
});

export const removeRemoteBodySchema = z.object({
  remote: z.string().min(1),
});

export const rebaseBodySchema = z.object({
  upstream: z.string().optional(),
  branch: z.string().optional(),
  interactive: z.boolean().optional(),
});

export const mergeBodySchema = z.object({
  from: z.string().optional(),
  branch: z.string().optional(),
  fastForwardOnly: z.boolean().optional(),
});

// ---------------------------------------------------------------------------
// Inferred option types (consumed by the service functions below)
// ---------------------------------------------------------------------------

export type PullOptions = z.infer<typeof pullBodySchema>;
export type PushOptions = z.infer<typeof pushBodySchema>;
export type FetchOptions = z.infer<typeof fetchBodySchema>;
export type RebaseOptions = z.infer<typeof rebaseBodySchema>;
export type MergeOptions = z.infer<typeof mergeBodySchema>;

// ---------------------------------------------------------------------------
// Service functions
// ---------------------------------------------------------------------------

export async function getStatus(
  directory: string,
  options?: { mode?: 'light' },
) {
  const client = getGitClient(directory);
  const status = await client.status();

  const payload: Record<string, unknown> = {
    currentBranch: status.current,
    tracking: status.tracking,
    isClean: status.isClean(),
    ahead: status.ahead,
    behind: status.behind,
    files: status.files.map((file) => ({
      path: file.path,
      index: file.index,
      working_dir: file.working_dir,
    })),
    staged: status.staged,
    modified: status.modified,
    not_added: status.not_added,
    deleted: status.deleted,
  };

  if (options?.mode !== 'light') {
    const stagedStats = await client.diff(['--cached', '--numstat']);
    const workingStats = await client.diff(['--numstat']);
    payload.diffStats = {
      staged: parseNumstat(stagedStats),
      working: parseNumstat(workingStats),
    };
  }

  return payload;
}

function parseNumstat(raw: string) {
  const map = new Map<
    string,
    { path: string; additions: number; deletions: number }
  >();
  raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .forEach((line) => {
      const [add, del, p] = line.split('\t');
      map.set(p, {
        path: p,
        additions: add === '-' ? 0 : Number.parseInt(add, 10),
        deletions: del === '-' ? 0 : Number.parseInt(del, 10),
      });
    });
  return Object.fromEntries(map);
}

export async function getPathDiff(
  directory: string,
  options: { path: string; staged?: boolean; contextLines?: number },
) {
  const client = getGitClient(directory);
  const args = ['--no-ext-diff', `--unified=${options.contextLines ?? 3}`];
  if (options.staged) args.push('--cached');
  args.push('--', options.path);
  const diff = await client.diff(args);
  return { diff, submodule: null };
}

export async function getFileDiff(
  directory: string,
  options: { path: string; staged?: boolean },
) {
  const client = getGitClient(directory);
  const args = ['--no-ext-diff'];
  if (options.staged) args.push('--cached');
  args.push('--', options.path);

  const original = await client.show([`HEAD:${options.path}`]).catch(() => '');

  let modified = '';
  try {
    modified = fs.readFileSync(path.join(directory, options.path), 'utf-8');
  } catch {
    modified = '';
  }

  return {
    original,
    modified,
    path: options.path,
    isBinary: false,
    submodule: null,
  };
}

export async function getRangeDiff(
  directory: string,
  options: {
    base: string;
    head: string;
    path?: string;
    contextLines?: number;
    includeWorkingTree?: boolean;
  },
) {
  const client = getGitClient(directory);
  const args = ['--no-ext-diff', `--unified=${options.contextLines ?? 3}`];
  if (options.includeWorkingTree) {
    args.push(options.base);
  } else {
    args.push(`${options.base}..${options.head}`);
  }
  if (options.path) args.push('--', options.path);
  return { diff: await client.diff(args) };
}

export async function getBranches(directory: string) {
  const client = getGitClient(directory);
  const local = await client.branchLocal();

  const remoteRaw = await client.raw(['branch', '-r']).catch(() => '');
  const remote = remoteRaw
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line && !line.includes('->'))
    .map((line) => ({ name: line, current: false, commit: '', label: '' }));

  return {
    current: local.current,
    all: [...local.all, ...remote.map((r) => r.name)],
    branches: [
      ...Object.values(local.branches).map((b) => ({
        name: b.name,
        current: b.current,
        commit: b.commit,
        label: b.label,
      })),
      ...remote,
    ],
  };
}

export async function listStashes(directory: string) {
  const client = getGitClient(directory);
  const raw = await client.raw(['stash', 'list', '--format=%gd|%s|%cr|%H']);
  return raw
    .trim()
    .split('\n')
    .filter(Boolean)
    .map((line) => {
      const [ref, message, relativeTime, hash] = line.split('|');
      return { ref, message, relativeTime, hash };
    });
}

export async function commit(
  directory: string,
  message: string,
  options?: { addAll?: boolean; files?: string[]; stageFiles?: string[] },
) {
  const client = getGitClient(directory);
  if (options?.addAll) {
    await client.add('.');
  } else if (options?.stageFiles && options.stageFiles.length > 0) {
    await client.add(options.stageFiles);
  } else if (options?.files && options.files.length > 0) {
    await client.add(options.files);
  }
  const result = await client.commit(message);
  return {
    success: true,
    branch: result.branch,
    commit: result.commit,
    summary: result.summary,
  };
}

export async function pull(directory: string, options: PullOptions = {}) {
  const client = getGitClient(directory);
  const args: string[] = [];
  if (options.rebase) args.push('--rebase');
  if (options.remote) args.push(options.remote);
  if (options.branch) args.push(options.branch);
  return client.pull(args.length > 0 ? args : undefined);
}

export async function push(directory: string, options: PushOptions = {}) {
  const client = getGitClient(directory);
  const args: string[] = [];
  if (options.force) args.push('--force');
  if (options.setUpstream) args.push('--set-upstream');
  if (options.remote) args.push(options.remote);
  if (options.branch) args.push(options.branch);
  return client.push(args.length > 0 ? args : undefined);
}

export async function fetch(directory: string, options: FetchOptions = {}) {
  const client = getGitClient(directory);
  const args: string[] = [];
  if (options.prune) args.push('--prune');
  if (options.remote) args.push(options.remote);
  return client.fetch(args.length > 0 ? args : undefined);
}

export async function rebase(directory: string, options: RebaseOptions = {}) {
  const client = getGitClient(directory);
  const args: string[] = [];
  if (options.interactive) args.push('--interactive');
  if (options.upstream) args.push(options.upstream);
  if (options.branch) args.push(options.branch);
  return client.rebase(args.length > 0 ? args : undefined);
}

export async function abortRebase(directory: string) {
  const client = getGitClient(directory);
  return client.rebase(['--abort']);
}

export async function continueRebase(directory: string) {
  const client = getGitClient(directory);
  return client.rebase(['--continue']);
}

export async function merge(directory: string, options: MergeOptions = {}) {
  const client = getGitClient(directory);
  const args: string[] = [];
  if (options.fastForwardOnly) args.push('--ff-only');
  const target = options.from ?? options.branch;
  if (target) args.push(target);
  if (args.length === 0) {
    throw new Error('merge requires a branch or "from" target');
  }
  return client.merge(args);
}

export async function abortMerge(directory: string) {
  const client = getGitClient(directory);
  return client.merge(['--abort']);
}

export async function continueMerge(directory: string) {
  const client = getGitClient(directory);
  return client.merge(['--continue']);
}

export async function getRemotes(directory: string) {
  const client = getGitClient(directory);
  return client.getRemotes(true);
}

export async function removeRemote(
  directory: string,
  options: { remote: string },
) {
  const client = getGitClient(directory);
  return client.removeRemote(options.remote);
}

export interface DiffSummaryEntry {
  path: string;
  additions: number;
  deletions: number;
}

/**
 * Returns the per-file additions/deletions for the whole working tree,
 * including untracked files (whose line count is used as "additions").
 * Mirrors the summary that the original `/api/git/diff` endpoint produced.
 */
export async function getDiffSummary(
  directory: string,
): Promise<DiffSummaryEntry[]> {
  const client = getGitClient(directory);

  const [numstatRaw, status] = await Promise.all([
    client.diff(['HEAD', '--numstat']),
    client.status(),
  ]);

  const summary = new Map<string, DiffSummaryEntry>();

  numstatRaw
    .trim()
    .split('\n')
    .filter(Boolean)
    .forEach((line) => {
      const [additions, deletions, relPath] = line.split('\t');
      if (!relPath) return;
      summary.set(relPath, {
        path: relPath,
        additions: additions === '-' ? 0 : Number.parseInt(additions, 10) || 0,
        deletions: deletions === '-' ? 0 : Number.parseInt(deletions, 10) || 0,
      });
    });

  for (const untrackedFile of status.not_added) {
    if (summary.has(untrackedFile)) continue;
    try {
      const fullPath = path.join(directory, untrackedFile);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const lineCount = content.split('\n').length;
      summary.set(untrackedFile, {
        path: untrackedFile,
        additions: lineCount,
        deletions: 0,
      });
    } catch {
      summary.set(untrackedFile, {
        path: untrackedFile,
        additions: 0,
        deletions: 0,
      });
    }
  }

  return Array.from(summary.values());
}
