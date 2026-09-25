// app/hooks/github.ts
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
} as const;

// ---------------------------------------------------------------------------
// Shared types
// ---------------------------------------------------------------------------

export type DeviceFlowStartInput = InferRequestType<
  (typeof $github)['device-flow']['start']['$post']
>['json'];
export type DeviceFlowExchangeInput = InferRequestType<
  (typeof $github)['device-flow']['exchange']['$post']
>['json'];
export type ActivateInput = InferRequestType<
  (typeof $github)['auth']['activate']['$post']
>['json'];

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
export type GitHubDeviceFlowStartResponse = InferResponseType<
  (typeof $github)['device-flow']['start']['$post'],
  200
>;
export type GitHubDeviceFlowExchangeResponse = InferResponseType<
  (typeof $github)['device-flow']['exchange']['$post'],
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
    throw new Error(apiError('githubRequestFailed', label, res.status));
  }
  return res.json() as Promise<T>;
}

// ---------------------------------------------------------------------------
// Query hooks — Auth status
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
        $github['auth']['status'].$get({ query: {} }),
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
    queryFn: async () => unwrap<GitHubMeResponse>($github.me.$get({}), 'me'),
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
    queryFn: async () => {
      if (!directory || !branch) return null;
      return unwrap<GitHubPrStatusResponse>(
        $github.pr.status.$get({
          query: { directory, branch, remote },
        }),
        'pr status',
      );
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Mutation factory
// ---------------------------------------------------------------------------

function useGitHubMutation<TInput, TResult>(
  fn: (input: TInput) => Promise<TResult>,
  invalidateKeys: ReadonlyArray<readonly unknown[]>,
  options?: Omit<UseMutationOptions<TResult, Error, TInput>, 'mutationFn'>,
) {
  const queryClient = useQueryClient();

  return useMutation<TResult, Error, TInput>({
    mutationFn: fn,
    onSuccess: (data, variables, onMutateResult, context) => {
      for (const key of invalidateKeys) {
        queryClient.invalidateQueries({ queryKey: key });
      }
      options?.onSuccess?.(data, variables, onMutateResult, context);
    },
    ...options,
  });
}

// ---------------------------------------------------------------------------
// Mutation hooks — Device flow
// ---------------------------------------------------------------------------

export function useGitHubStartDeviceFlow() {
  return useGitHubMutation(
    (json: DeviceFlowStartInput) =>
      unwrap<GitHubDeviceFlowStartResponse>(
        $github['device-flow']['start'].$post({ json }),
        'device flow start',
      ),
    [],
  );
}

export function useGitHubExchangeDeviceCode() {
  return useGitHubMutation(
    (json: DeviceFlowExchangeInput) =>
      unwrap<GitHubDeviceFlowExchangeResponse>(
        $github['device-flow']['exchange'].$post({ json }),
        'device flow exchange',
      ),
    [githubKeys.authStatus(), githubKeys.me()],
  );
}

// ---------------------------------------------------------------------------
// Mutation hooks — Account management
// ---------------------------------------------------------------------------

export function useGitHubActivateAccount() {
  return useGitHubMutation(
    (json: ActivateInput) =>
      unwrap($github['auth']['activate'].$post({ json }), 'activate account'),
    [githubKeys.authStatus(), githubKeys.me()],
  );
}

export function useGitHubDisconnect() {
  return useGitHubMutation<void, unknown>(
    () => unwrap($github['auth']['disconnect'].$post({}), 'disconnect'),
    [githubKeys.all()],
  );
}
