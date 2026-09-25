// app/hooks/git.ts
import {
  type UseMutationOptions,
  type UseQueryOptions,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import type { InferRequestType, InferResponseType } from 'hono/client';

import { apiError } from '@/app/hooks/i18n/api-errors';
import { honoClient } from '@/app/lib';

const $git = honoClient.api.git;

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const gitKeys = {
  all: (directory?: string) => ['git', directory ?? 'default'] as const,

  summary: (directory?: string) =>
    [...gitKeys.all(directory), 'summary'] as const,

  status: (directory?: string) =>
    [...gitKeys.all(directory), 'status'] as const,
  currentBranch: (directory?: string) =>
    [...gitKeys.all(directory), 'currentBranch'] as const,
  errorCode: (directory?: string) =>
    [...gitKeys.all(directory), 'error-code'] as const,

  diff: (directory?: string, path?: string, staged = false) =>
    [...gitKeys.all(directory), 'diff', path ?? 'all', staged] as const,
  fileDiff: (directory?: string, path?: string, staged = false) =>
    [...gitKeys.all(directory), 'file-diff', path ?? 'all', staged] as const,
  rangeDiff: (
    directory?: string,
    base?: string,
    head?: string,
    path?: string,
  ) =>
    [
      ...gitKeys.all(directory),
      'range-diff',
      base ?? '',
      head ?? '',
      path ?? 'all',
    ] as const,

  branches: (directory?: string) =>
    [...gitKeys.all(directory), 'branches'] as const,
  worktrees: (directory?: string) =>
    [...gitKeys.all(directory), 'worktrees'] as const,
  stashes: (directory?: string) =>
    [...gitKeys.all(directory), 'stashes'] as const,
  remotes: (directory?: string) =>
    [...gitKeys.all(directory), 'remotes'] as const,
} as const;

// ---------------------------------------------------------------------------
// Shared types (derived from the Hono RPC client)
// ---------------------------------------------------------------------------

export type CommitInput = InferRequestType<typeof $git.commit.$post>['json'];
export type CheckoutInput = InferRequestType<
  typeof $git.checkout.$post
>['json'];
export type DiffQuery = InferRequestType<typeof $git.diff.$get>['query'];
export type FileDiffQuery = InferRequestType<
  (typeof $git)['file-diff']['$get']
>['query'];
export type RangeDiffQuery = InferRequestType<
  (typeof $git)['range-diff']['$get']
>['query'];

export type GitStatusResponse = InferResponseType<typeof $git.status.$get, 200>;
export type GitBranchesResponse = InferResponseType<
  typeof $git.branches.$get,
  200
>;
export type GitWorktreesResponse = InferResponseType<
  typeof $git.worktrees.$get,
  200
>;
export type GitDiffResponse = InferResponseType<typeof $git.diff.$get, 200>;
export type GitFileDiffResponse = InferResponseType<
  (typeof $git)['file-diff']['$get'],
  200
>;
export type GitRangeDiffResponse = InferResponseType<
  (typeof $git)['range-diff']['$get'],
  200
>;
export type GitStashesResponse = InferResponseType<
  typeof $git.stashes.$get,
  200
>;
export type GitRemotesResponse = InferResponseType<
  typeof $git.remotes.$get,
  200
>;

export type GitErrorCodeResponse = InferResponseType<
  (typeof $git)['error-code']['$get'],
  200 | 400 | 404
>;

export type GitSummaryResponse = InferResponseType<
  typeof $git.summary.$get,
  200
>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function unwrap<T>(
  promise: Promise<Response>,
  label: string,
): Promise<T> {
  const res = await promise;
  if (!res.ok) {
    throw new Error(apiError('gitRequestFailed', label, res.status));
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Query hooks — Status & Branch
// ---------------------------------------------------------------------------

export function useGitStatus(
  directory?: string,
  options?: Omit<
    UseQueryOptions<GitStatusResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitStatusResponse | null, Error>({
    queryKey: gitKeys.status(directory),
    enabled: Boolean(directory),
    queryFn: async () => {
      if (!directory) return null;
      return unwrap<GitStatusResponse>(
        $git.status.$get({ query: { directory } }),
        'status',
      );
    },
    ...options,
  });
}

export function useGitCurrentBranch(
  directory?: string,
  options?: Omit<
    UseQueryOptions<{ currentBranch: string | null } | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<{ currentBranch: string | null } | null, Error>({
    queryKey: gitKeys.currentBranch(directory),
    enabled: Boolean(directory),
    queryFn: async () => {
      if (!directory) return null;
      return unwrap($git.current.$get({ query: { directory } }), 'current');
    },
    ...options,
  });
}

export function useGitErrorCode(
  directory?: string,
  options?: Omit<
    UseQueryOptions<GitErrorCodeResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitErrorCodeResponse | null, Error>({
    queryKey: gitKeys.errorCode(directory),
    enabled: Boolean(directory),
    queryFn: async () => {
      if (!directory) return null;
      // This endpoint always returns a body, even on 4xx, so we
      // intentionally do NOT use `unwrap` here.
      const res = await $git['error-code'].$get({ query: { directory } });
      return res.json();
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Query hooks — Diff
// ---------------------------------------------------------------------------

export function useGitDiff(
  directory?: string,
  filePath?: string,
  staged = false,
  options?: Omit<
    UseQueryOptions<GitDiffResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitDiffResponse | null, Error>({
    queryKey: gitKeys.diff(directory, filePath, staged),
    enabled: Boolean(directory),
    queryFn: async () => {
      if (!directory) return null;
      return unwrap<GitDiffResponse>(
        $git.diff.$get({
          query: {
            directory,
            path: filePath ?? '',
            ...(staged ? { staged: 'true' as const } : {}),
          },
        }),
        'diff',
      );
    },
    ...options,
  });
}

export function useGitFileDiff(
  directory?: string,
  filePath?: string,
  staged = false,
  options?: Omit<
    UseQueryOptions<GitFileDiffResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitFileDiffResponse | null, Error>({
    queryKey: gitKeys.fileDiff(directory, filePath, staged),
    enabled: Boolean(directory && filePath),
    queryFn: async () => {
      if (!directory || !filePath) return null;
      return unwrap<GitFileDiffResponse>(
        $git['file-diff'].$get({
          query: {
            directory,
            path: filePath,
            ...(staged ? { staged: 'true' as const } : {}),
          },
        }),
        'file-diff',
      );
    },
    ...options,
  });
}

export function useGitRangeDiff(
  directory?: string,
  base?: string,
  head?: string,
  filePath?: string,
  options?: Omit<
    UseQueryOptions<GitRangeDiffResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitRangeDiffResponse | null, Error>({
    queryKey: gitKeys.rangeDiff(directory, base, head, filePath),
    enabled: Boolean(directory && base && head),
    queryFn: async () => {
      if (!directory || !base || !head) return null;
      return unwrap<GitRangeDiffResponse>(
        $git['range-diff'].$get({
          query: { directory, base, head, path: filePath },
        }),
        'range-diff',
      );
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Query hooks — Branches & Worktrees
// ---------------------------------------------------------------------------

export function useGitBranches(
  directory?: string,
  options?: Omit<
    UseQueryOptions<GitBranchesResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitBranchesResponse | null, Error>({
    queryKey: gitKeys.branches(directory),
    enabled: Boolean(directory),
    queryFn: async () => {
      if (!directory) return null;
      return unwrap<GitBranchesResponse>(
        $git.branches.$get({ query: { directory } }),
        'branches',
      );
    },
    ...options,
  });
}

export function useGitWorktrees(
  directory?: string,
  options?: Omit<
    UseQueryOptions<GitWorktreesResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitWorktreesResponse | null, Error>({
    queryKey: gitKeys.worktrees(directory),
    enabled: Boolean(directory),
    queryFn: async () => {
      if (!directory) return null;
      return unwrap<GitWorktreesResponse>(
        $git.worktrees.$get({ query: { directory } }),
        'worktrees',
      );
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Query hooks — Stashes
// ---------------------------------------------------------------------------

export function useGitStashes(
  directory?: string,
  options?: Omit<
    UseQueryOptions<GitStashesResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitStashesResponse | null, Error>({
    queryKey: gitKeys.stashes(directory),
    enabled: Boolean(directory),
    queryFn: async () => {
      if (!directory) return null;
      return unwrap<GitStashesResponse>(
        $git.stashes.$get({ query: { directory } }),
        'stashes',
      );
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Query hooks — Remotes
// ---------------------------------------------------------------------------

export function useGitRemotes(
  directory?: string,
  options?: Omit<
    UseQueryOptions<GitRemotesResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitRemotesResponse | null, Error>({
    queryKey: gitKeys.remotes(directory),
    enabled: Boolean(directory),
    queryFn: async () => {
      if (!directory) return null;
      return unwrap<GitRemotesResponse>(
        $git.remotes.$get({ query: { directory } }),
        'remotes',
      );
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Mutation factory
// ---------------------------------------------------------------------------

function useGitMutation<TInput, TResult>(
  fn: (input: TInput) => Promise<TResult>,
  getDirectory: (input: TInput) => string | undefined,
  options?: Omit<UseMutationOptions<TResult, Error, TInput>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();

  return useMutation<TResult, Error, TInput>({
    mutationFn: fn,
    onSuccess: (data, variables, onMutateResult, context) => {
      const directory = getDirectory(variables);
      queryClient.invalidateQueries({ queryKey: gitKeys.all(directory) });
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Body type aliases (used to split { directory, ...body } cleanly)
// ---------------------------------------------------------------------------

type PullBody = InferRequestType<typeof $git.pull.$post>['json'];
type PushBody = InferRequestType<typeof $git.push.$post>['json'];
type FetchBody = InferRequestType<typeof $git.fetch.$post>['json'];
type StashPushBody = InferRequestType<typeof $git.stash.$post>['json'];
type StashRefBody = InferRequestType<typeof $git.stash.apply.$post>['json'];
type RemoveRemoteBody = InferRequestType<typeof $git.remotes.$delete>['json'];
type DeleteBranchBody = InferRequestType<typeof $git.branches.$delete>['json'];
type RebaseBody = InferRequestType<typeof $git.rebase.$post>['json'];
type MergeBody = InferRequestType<typeof $git.merge.$post>['json'];

type WithDirectory<TBody> = { directory: string } & TBody;

// ---------------------------------------------------------------------------
// Mutation hooks — Commit & Checkout
// ---------------------------------------------------------------------------

export function useGitCommit() {
  return useGitMutation(
    (json: CommitInput) => unwrap($git.commit.$post({ json }), 'commit'),
    (json) => json.directory,
  );
}

export function useGitCheckout() {
  return useGitMutation(
    (json: CheckoutInput) => unwrap($git.checkout.$post({ json }), 'checkout'),
    (json) => json.directory,
  );
}

// ---------------------------------------------------------------------------
// Mutation hooks — Pull / Push / Fetch
// ---------------------------------------------------------------------------

export function useGitPull() {
  return useGitMutation(
    ({ directory, ...json }: WithDirectory<PullBody>) =>
      unwrap($git.pull.$post({ query: { directory }, json }), 'pull'),
    ({ directory }) => directory,
  );
}

export function useGitPush() {
  return useGitMutation(
    ({ directory, ...json }: WithDirectory<PushBody>) =>
      unwrap($git.push.$post({ query: { directory }, json }), 'push'),
    ({ directory }) => directory,
  );
}

export function useGitFetch() {
  return useGitMutation(
    ({ directory, ...json }: WithDirectory<FetchBody>) =>
      unwrap($git.fetch.$post({ query: { directory }, json }), 'fetch'),
    ({ directory }) => directory,
  );
}

// ---------------------------------------------------------------------------
// Mutation hooks — Stash operations
// ---------------------------------------------------------------------------

export function useGitStashPush() {
  return useGitMutation(
    ({ directory, ...json }: WithDirectory<StashPushBody>) =>
      unwrap($git.stash.$post({ query: { directory }, json }), 'stash push'),
    ({ directory }) => directory,
  );
}

export function useGitStashApply() {
  return useGitMutation(
    ({ directory, ...json }: WithDirectory<StashRefBody>) =>
      unwrap(
        $git.stash.apply.$post({ query: { directory }, json }),
        'stash apply',
      ),
    ({ directory }) => directory,
  );
}

export function useGitStashPop() {
  return useGitMutation(
    ({ directory, ...json }: WithDirectory<StashRefBody>) =>
      unwrap($git.stash.pop.$post({ query: { directory }, json }), 'stash pop'),
    ({ directory }) => directory,
  );
}

export function useGitStashDrop() {
  return useGitMutation(
    ({ directory, ...json }: WithDirectory<StashRefBody>) =>
      unwrap(
        $git.stash.drop.$post({ query: { directory }, json }),
        'stash drop',
      ),
    ({ directory }) => directory,
  );
}

// ---------------------------------------------------------------------------
// Mutation hooks — Remotes
// ---------------------------------------------------------------------------

export function useGitRemoveRemote() {
  return useGitMutation(
    ({ directory, ...json }: WithDirectory<RemoveRemoteBody>) =>
      unwrap(
        $git.remotes.$delete({ query: { directory }, json }),
        'remove remote',
      ),
    ({ directory }) => directory,
  );
}

// ---------------------------------------------------------------------------
// Mutation hooks — Branches
// ---------------------------------------------------------------------------

export function useGitDeleteBranch() {
  return useGitMutation(
    ({ directory, ...json }: WithDirectory<DeleteBranchBody>) =>
      unwrap(
        $git.branches.$delete({ query: { directory }, json }),
        'delete branch',
      ),
    ({ directory }) => directory,
  );
}

// ---------------------------------------------------------------------------
// Mutation hooks — Rebase
// ---------------------------------------------------------------------------

export function useGitRebase() {
  return useGitMutation(
    ({ directory, ...json }: WithDirectory<RebaseBody>) =>
      unwrap($git.rebase.$post({ query: { directory }, json }), 'rebase'),
    ({ directory }) => directory,
  );
}

export function useGitRebaseAbort() {
  return useGitMutation(
    ({ directory }: { directory: string }) =>
      unwrap($git.rebase.abort.$post({ query: { directory } }), 'rebase abort'),
    ({ directory }) => directory,
  );
}

export function useGitRebaseContinue() {
  return useGitMutation(
    ({ directory }: { directory: string }) =>
      unwrap(
        $git.rebase.continue.$post({ query: { directory } }),
        'rebase continue',
      ),
    ({ directory }) => directory,
  );
}

// ---------------------------------------------------------------------------
// Mutation hooks — Merge
// ---------------------------------------------------------------------------

export function useGitMerge() {
  return useGitMutation(
    ({ directory, ...json }: WithDirectory<MergeBody>) =>
      unwrap($git.merge.$post({ query: { directory }, json }), 'merge'),
    ({ directory }) => directory,
  );
}

export function useGitMergeAbort() {
  return useGitMutation(
    ({ directory }: { directory: string }) =>
      unwrap($git.merge.abort.$post({ query: { directory } }), 'merge abort'),
    ({ directory }) => directory,
  );
}

export function useGitMergeContinue() {
  return useGitMutation(
    ({ directory }: { directory: string }) =>
      unwrap(
        $git.merge.continue.$post({ query: { directory } }),
        'merge continue',
      ),
    ({ directory }) => directory,
  );
}

export function useGitSummary(
  directory?: string,
  options?: Omit<
    UseQueryOptions<GitSummaryResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitSummaryResponse | null, Error>({
    queryKey: gitKeys.summary(directory),
    enabled: Boolean(directory),
    queryFn: async () => {
      if (!directory) return null;
      return unwrap<GitSummaryResponse>(
        $git.summary.$get({ query: { directory } }),
        'summary',
      );
    },
    ...options,
  });
}
