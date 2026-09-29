// app/hooks/api/github.ts
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

const $github = honoClient.api.github;

// ---------------------------------------------------------------------------
// Query keys
// ---------------------------------------------------------------------------

export const githubKeys = {
  all: () => ['github'] as const,

  authStatus: () => [...githubKeys.all(), 'auth', 'status'] as const,
  me: () => [...githubKeys.all(), 'me'] as const,

  prStatus: (directory?: string, branch?: string, remote?: string) =>
    [
      ...githubKeys.all(),
      'pr',
      'status',
      directory ?? '',
      branch ?? '',
      remote ?? '',
    ] as const,

  // Prefix keys: React Query matches query keys by prefix, so invalidating a
  // whole family needs a key that stops before the variable segments.
  prStatusForDirectory: (directory?: string) =>
    [...githubKeys.all(), 'pr', 'status', directory ?? ''] as const,

  prContext: (
    directory: string | undefined,
    number: number | undefined,
    options?: {
      diff?: boolean;
      checkDetails?: boolean;
      owner?: string;
      repo?: string;
    },
  ) =>
    [
      ...githubKeys.all(),
      'pulls',
      'context',
      directory ?? '',
      String(number ?? ''),
      options?.owner ?? '',
      options?.repo ?? '',
      options?.diff ? 'diff' : '',
      options?.checkDetails ? 'details' : '',
    ] as const,

  prContextFor: (directory: string | undefined, number: number | undefined) =>
    [
      ...githubKeys.all(),
      'pulls',
      'context',
      directory ?? '',
      String(number ?? ''),
    ] as const,

  branches: (owner?: string, repo?: string) =>
    [...githubKeys.all(), 'repo', 'branches', owner ?? '', repo ?? ''] as const,

  upstream: (directory?: string) =>
    [...githubKeys.all(), 'repo', 'upstream', directory ?? ''] as const,

  pullList: (directory?: string, query?: string) =>
    [
      ...githubKeys.all(),
      'pulls',
      'list',
      directory ?? '',
      query ?? '',
    ] as const,

  pullListForDirectory: (directory?: string) =>
    [...githubKeys.all(), 'pulls', 'list', directory ?? ''] as const,

  issueList: (directory?: string, query?: string) =>
    [
      ...githubKeys.all(),
      'issues',
      'list',
      directory ?? '',
      query ?? '',
    ] as const,

  issueListForDirectory: (directory?: string) =>
    [...githubKeys.all(), 'issues', 'list', directory ?? ''] as const,

  issue: (directory: string | undefined, number: number | undefined) =>
    [
      ...githubKeys.all(),
      'issues',
      'get',
      directory ?? '',
      String(number ?? ''),
    ] as const,

  issueComments: (directory: string | undefined, number: number | undefined) =>
    [
      ...githubKeys.all(),
      'issues',
      'comments',
      directory ?? '',
      String(number ?? ''),
    ] as const,
} as const;

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type DeviceFlowStartInput = InferRequestType<
  (typeof $github)['auth']['start']['$post']
>['json'];
export type DeviceFlowCompleteInput = InferRequestType<
  (typeof $github)['auth']['complete']['$post']
>['json'];
export type ActivateInput = InferRequestType<
  (typeof $github)['auth']['activate']['$post']
>['json'];
export type GhCliInput = InferRequestType<
  (typeof $github)['auth']['gh-cli']['$post']
>['json'];
export type PrStatusQuery = InferRequestType<
  (typeof $github)['pr']['status']['$get']
>['query'];
export type PrCreateInput = InferRequestType<
  (typeof $github)['pr']['create']['$post']
>['json'];
export type PrUpdateInput = InferRequestType<
  (typeof $github)['pr']['update']['$post']
>['json'];
export type PrMergeInput = InferRequestType<
  (typeof $github)['pr']['merge']['$post']
>['json'];
export type PrReadyInput = InferRequestType<
  (typeof $github)['pr']['ready']['$post']
>['json'];
export type PrDescribeInput = {
  directory: string;
  base?: string;
  head?: string;
  model?: { providerId: string; modelId: string };
};
export type RepoListQuery = InferRequestType<
  (typeof $github)['pulls']['list']['$get']
>['query'];
export type RepoItemQuery = InferRequestType<
  (typeof $github)['pulls']['context']['$get']
>['query'];
export type BranchesQuery = InferRequestType<
  (typeof $github)['repo']['branches']['$get']
>['query'];
export type UpstreamQuery = InferRequestType<
  (typeof $github)['repo']['upstream']['$get']
>['query'];

export type GitHubAuthStatusResponse = InferResponseType<
  (typeof $github)['auth']['status']['$get'],
  200
>;
export type GitHubMeResponse = InferResponseType<
  (typeof $github)['me']['$get'],
  200
>;
export type GitHubPrStatusResponse = InferResponseType<
  (typeof $github)['pr']['status']['$get'],
  200
>;
export type GitHubPrResponse = InferResponseType<
  (typeof $github)['pr']['create']['$post'],
  200
>;
export type GitHubDeviceFlowStartResponse = InferResponseType<
  (typeof $github)['auth']['start']['$post'],
  200
>;
export type GitHubDeviceFlowCompleteResponse = InferResponseType<
  (typeof $github)['auth']['complete']['$post'],
  200
>;
export type GitHubBranchesResponse = InferResponseType<
  (typeof $github)['repo']['branches']['$get'],
  200
>;
export type GitHubUpstreamResponse = InferResponseType<
  (typeof $github)['repo']['upstream']['$get'],
  200
>;
export type GitHubPullListResponse = InferResponseType<
  (typeof $github)['pulls']['list']['$get'],
  200
>;
export type GitHubPullContextResponse = InferResponseType<
  (typeof $github)['pulls']['context']['$get'],
  200
>;
export type GitHubIssueListResponse = InferResponseType<
  (typeof $github)['issues']['list']['$get'],
  200
>;
export type GitHubIssueResponse = InferResponseType<
  (typeof $github)['issues']['get']['$get'],
  200
>;
export type GitHubIssueCommentsResponse = InferResponseType<
  (typeof $github)['issues']['comments']['$get'],
  200
>;
export type GitHubPrDescriptionResponse = {
  title: string;
  body: string;
};

export type GitHubMergeResult = {
  merged?: boolean;
  message?: string;
};

export type GitHubReadyResult = {
  ready?: boolean;
};

export type GitHubUser = NonNullable<
  Extract<GitHubAuthStatusResponse, { connected: true }>['user']
>;

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Turns a non-2xx response into the server's own `{ error }` message when it
 * has one. GitHub write failures return a human-readable reason ("Branch not
 * found on fork…"), and that text beats a generic status code.
 */
async function unwrap<T>(
  promise: Promise<Response>,
  label: string,
): Promise<T> {
  const res = await promise;
  if (!res.ok) {
    const payload = await res
      .json()
      .then((value: unknown) =>
        typeof (value as { error?: unknown })?.error === 'string'
          ? (value as { error: string }).error
          : null,
      )
      .catch(() => null);

    throw new Error(
      payload ?? apiError('githubRequestFailed', label, res.status),
    );
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Query hooks — Auth
// ---------------------------------------------------------------------------

export function useGitHubAuthStatus(
  options?: Omit<
    UseQueryOptions<GitHubAuthStatusResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitHubAuthStatusResponse | null, Error>({
    queryKey: githubKeys.authStatus(),
    queryFn: async () =>
      unwrap<GitHubAuthStatusResponse>(
        $github['auth']['status'].$get(),
        'auth status',
      ),
    ...options,
  });
}

export function useGitHubMe(
  options?: Omit<
    UseQueryOptions<GitHubMeResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitHubMeResponse | null, Error>({
    queryKey: githubKeys.me(),
    enabled: false,
    queryFn: async () => unwrap<GitHubMeResponse>($github.me.$get(), 'me'),
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Query hooks — PR status
// ---------------------------------------------------------------------------

export function useGitHubPrStatus(
  directory?: string,
  branch?: string,
  remote?: string,
  options?: Omit<
    UseQueryOptions<GitHubPrStatusResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitHubPrStatusResponse | null, Error>({
    queryKey: githubKeys.prStatus(directory, branch, remote),
    enabled: Boolean(directory && branch),
    // The badge in the status panel is the reason this poll exists, so keep it
    // warm; the server caches per branch and honours ETag on top of that.
    refetchInterval: 60_000,
    queryFn: async () => {
      if (!directory || !branch) return null;
      return unwrap<GitHubPrStatusResponse>(
        $github.pr.status.$get({ query: { directory, branch, remote } }),
        'pr status',
      );
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Query hooks — PR context
// ---------------------------------------------------------------------------

export function useGitHubPullContext(
  directory: string | undefined,
  number: number | undefined,
  options?: {
    diff?: boolean;
    checkDetails?: boolean;
    owner?: string;
    repo?: string;
    enabled?: boolean;
  },
) {
  const query = useQuery<GitHubPullContextResponse | null, Error>({
    queryKey: githubKeys.prContext(directory, number, options),
    enabled: Boolean(directory && number) && options?.enabled !== false,
    queryFn: async () => {
      if (!directory || !number) return null;
      return unwrap<GitHubPullContextResponse>(
        $github['pulls']['context'].$get({
          query: {
            directory,
            number: String(number),
            diff: options?.diff ? 'true' : 'false',
            checkDetails: options?.checkDetails ? 'true' : 'false',
            ...(options?.owner ? { owner: options.owner } : {}),
            ...(options?.repo ? { repo: options.repo } : {}),
          },
        }),
        'pull request',
      );
    },
  });

  return query;
}

// ---------------------------------------------------------------------------
// Query hooks — Repos
// ---------------------------------------------------------------------------

export function useGitHubBranches(
  owner?: string,
  repo?: string,
  options?: {
    enabled?: boolean;
  } & Omit<
    UseQueryOptions<GitHubBranchesResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitHubBranchesResponse | null, Error>({
    queryKey: githubKeys.branches(owner, repo),
    enabled: Boolean(owner && repo) && options?.enabled !== false,
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!owner || !repo) return null;
      return unwrap<GitHubBranchesResponse>(
        $github['repo']['branches'].$get({ query: { owner, repo } }),
        'branches',
      );
    },
    ...options,
  });
}

export function useGitHubUpstream(
  directory?: string,
  options?: Omit<
    UseQueryOptions<GitHubUpstreamResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitHubUpstreamResponse | null, Error>({
    queryKey: githubKeys.upstream(directory),
    enabled: Boolean(directory),
    staleTime: 5 * 60_000,
    queryFn: async () => {
      if (!directory) return null;
      return unwrap<GitHubUpstreamResponse>(
        $github['repo']['upstream'].$get({ query: { directory } }),
        'upstream',
      );
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Query hooks — PRs and issues
// ---------------------------------------------------------------------------

export function useGitHubPullList(
  directory?: string,
  query?: string,
  page = 1,
  options?: Omit<
    UseQueryOptions<GitHubPullListResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitHubPullListResponse | null, Error>({
    queryKey: [...githubKeys.pullList(directory, query), page],
    enabled: Boolean(directory),
    queryFn: async () => {
      if (!directory) return null;
      return unwrap<GitHubPullListResponse>(
        $github['pulls']['list'].$get({
          query: { directory, page: String(page), query },
        }),
        'pull requests',
      );
    },
    ...options,
  });
}

export function useGitHubIssueList(
  directory?: string,
  query?: string,
  page = 1,
  options?: Omit<
    UseQueryOptions<GitHubIssueListResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitHubIssueListResponse | null, Error>({
    queryKey: [...githubKeys.issueList(directory, query), page],
    enabled: Boolean(directory),
    queryFn: async () => {
      if (!directory) return null;
      return unwrap<GitHubIssueListResponse>(
        $github['issues']['list'].$get({
          query: { directory, page: String(page), query },
        }),
        'issues',
      );
    },
    ...options,
  });
}

export function useGitHubIssue(
  directory: string | undefined,
  number: number | undefined,
  options?: Omit<
    UseQueryOptions<GitHubIssueResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitHubIssueResponse | null, Error>({
    queryKey: githubKeys.issue(directory, number),
    enabled: Boolean(directory && number),
    queryFn: async () => {
      if (!directory || !number) return null;
      return unwrap<GitHubIssueResponse>(
        $github['issues']['get'].$get({
          query: { directory, number: String(number) },
        }),
        'issue',
      );
    },
    ...options,
  });
}

export function useGitHubIssueComments(
  directory: string | undefined,
  number: number | undefined,
  options?: Omit<
    UseQueryOptions<GitHubIssueCommentsResponse | null, Error>,
    'queryKey' | 'queryFn'
  >,
) {
  return useQuery<GitHubIssueCommentsResponse | null, Error>({
    queryKey: githubKeys.issueComments(directory, number),
    enabled: Boolean(directory && number),
    queryFn: async () => {
      if (!directory || !number) return null;
      return unwrap<GitHubIssueCommentsResponse>(
        $github['issues']['comments'].$get({
          query: { directory, number: String(number) },
        }),
        'issue comments',
      );
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Mutation factory
// ---------------------------------------------------------------------------

/**
 * `invalidateKeys` may be a function of the mutation variables, because most
 * PR mutations invalidate keys that are only known once the call is made (the
 * directory and PR number come from the form).
 */
function useGitHubMutation<TInput, TResult>(
  fn: (input: TInput) => Promise<TResult>,
  invalidateKeys:
    | ReadonlyArray<readonly unknown[]>
    | ((variables: TInput) => ReadonlyArray<readonly unknown[]>),
  options?: Omit<UseMutationOptions<TResult, Error, TInput>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();

  return useMutation<TResult, Error, TInput>({
    mutationFn: fn,
    onSuccess: (data, variables, onMutateResult, context) => {
      const keys =
        typeof invalidateKeys === 'function'
          ? invalidateKeys(variables)
          : invalidateKeys;
      for (const key of keys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
}

/** Every PR read for a directory depends on its branch, repo, and PR lists. */
function invalidateDirectory(directory: string | undefined) {
  return directory
    ? ([
        githubKeys.prStatusForDirectory(directory),
        githubKeys.upstream(directory),
        githubKeys.pullListForDirectory(directory),
        githubKeys.issueListForDirectory(directory),
      ] as const)
    : ([githubKeys.all()] as const);
}

// ---------------------------------------------------------------------------
// Mutation hooks — Auth
// ---------------------------------------------------------------------------

export function useGitHubStartDeviceFlow() {
  return useGitHubMutation(
    (json: DeviceFlowStartInput) =>
      unwrap<GitHubDeviceFlowStartResponse>(
        $github['auth']['start'].$post({ json }),
        'device flow start',
      ),
    [],
  );
}

export function useGitHubCompleteDeviceFlow() {
  return useGitHubMutation(
    (json: DeviceFlowCompleteInput) =>
      unwrap<GitHubDeviceFlowCompleteResponse>(
        $github['auth']['complete'].$post({ json }),
        'device flow complete',
      ),
    [githubKeys.authStatus(), githubKeys.me()],
  );
}

export function useGitHubActivateAccount() {
  return useGitHubMutation(
    (json: ActivateInput) =>
      unwrap($github['auth']['activate'].$post({ json }), 'activate account'),
    [githubKeys.authStatus(), githubKeys.me()],
  );
}

export function useGitHubDisconnect() {
  return useGitHubMutation<void, unknown>(
    () => unwrap($github['auth']['$delete'](), 'disconnect'),
    [githubKeys.all()],
  );
}

export function useGitHubSetGhCli() {
  return useGitHubMutation(
    (json: GhCliInput) =>
      unwrap($github['auth']['gh-cli'].$post({ json }), 'gh cli'),
    [githubKeys.authStatus(), githubKeys.me()],
  );
}

// ---------------------------------------------------------------------------
// Mutation hooks — PRs
// ---------------------------------------------------------------------------

export function useGitHubCreatePr() {
  return useGitHubMutation(
    (json: PrCreateInput) =>
      unwrap<GitHubPrResponse>(
        $github['pr']['create'].$post({ json }),
        'create pull request',
      ),
    (json) => invalidateDirectory(json.directory),
  );
}

export function useGitHubUpdatePr() {
  return useGitHubMutation(
    (json: PrUpdateInput) =>
      unwrap<GitHubPrResponse>(
        $github['pr']['update'].$post({ json }),
        'update pull request',
      ),
    (json) => [
      ...invalidateDirectory(json.directory),
      githubKeys.prContextFor(json.directory, json.number),
    ],
  );
}

export function useGitHubMergePr() {
  return useGitHubMutation(
    (json: PrMergeInput) =>
      unwrap<GitHubMergeResult>(
        $github['pr']['merge'].$post({ json }),
        'merge pull request',
      ),
    (json) => [
      ...invalidateDirectory(json.directory),
      githubKeys.prContextFor(json.directory, json.number),
    ],
  );
}

export function useGitHubMarkPrReady() {
  return useGitHubMutation(
    (json: PrReadyInput) =>
      unwrap<GitHubReadyResult>(
        $github['pr']['ready'].$post({ json }),
        'mark pull request ready',
      ),
    (json) => [
      ...invalidateDirectory(json.directory),
      githubKeys.prContextFor(json.directory, json.number),
    ],
  );
}

export function useGitHubDescribePr() {
  return useGitHubMutation(
    (json: PrDescribeInput) =>
      unwrap<GitHubPrDescriptionResponse>(
        $github['pr']['describe'].$post({ json }),
        'generate pull request description',
      ),
    [],
  );
}
