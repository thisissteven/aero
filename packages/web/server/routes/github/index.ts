// github/routes.ts
//
// HTTP surface for the GitHub integration. Routes stay thin: validate with
// zod, delegate to the service layer, shape the response.
//
// A recurring convention here: "not connected" and "repo not visible" are
// *successful* responses (`connected: false`, `repo: null`), not errors. A
// disconnected GitHub is a normal state the UI renders as a connect prompt,
// and a private repo the token can't read should quietly show "no PR" rather
// than an error banner. Genuine failures (401, 403 on a write, 5xx) still
// surface as errors.

import { zValidator } from '@hono/zod-validator';
import type { Octokit } from '@octokit/rest';
import { Hono } from 'hono';

import { getRemotes, getTrackingBranch } from '@/server/routes/git/service';

import {
  activateGitHubAuth,
  clearGitHubAuth,
  createOctokit,
  GH_CLI_ACCOUNT_ID,
  getGitHubAuth,
  getGitHubAuthAccounts,
  getGitHubClientId,
  getGitHubScopes,
  getOctokitOrNull,
  isGhCliActive,
  isGhCliDisabled,
  setGhCliActive,
  setGhCliDisabled,
  setGitHubAuth,
} from './auth';
import { exchangeDeviceCode, startDeviceFlow } from './device-flow';
import { clearGhCliTokenCache, getGhCliToken } from './gh-cli-credential';
import { describePullRequest } from './pr-description';
import { invalidateRepoPullsCache, resolveGitHubPrStatus } from './pr-status';
import { isGitHubRateLimited, noteIfGitHubRateLimit } from './rate-limit';
import {
  isAuthInvalid,
  isResourceUnavailable,
  normalizeText,
  parseGitHubRemoteUrl,
  resolveGitHubRepoFromDirectory,
  resolveRepoForRequest,
  resolveRepoNetwork,
} from './repo';
import {
  type CheckRunDetail,
  fetchChecksForRef,
  GitHubAuthInvalidError,
  GitHubNotConnectedError,
  GitHubRepoNotFoundError,
  getGitHubUserSummary,
  githubActivateBodySchema,
  githubBranchesQuerySchema,
  githubDeviceFlowCompleteBodySchema,
  githubDeviceFlowStartBodySchema,
  githubGhCliBodySchema,
  githubPrCreateBodySchema,
  githubPrDescribeBodySchema,
  githubPrMergeBodySchema,
  githubPrNumberBodySchema,
  githubPrStatusQuerySchema,
  githubPrUpdateBodySchema,
  githubRepoItemQuerySchema,
  githubRepoListQuerySchema,
  githubUpstreamQuerySchema,
  mapAuthor,
  mapHeadRepo,
  mapLabels,
  type RepoRefResponse,
  resolvePullRequestState,
  safeListForRepo,
  withTimeout,
} from './service';

const PR_STATUS_CACHE_TTL_MS = 90_000;
const PR_STATUS_CACHE_MAX_ENTRIES = 200;
// Resolving one branch's PR fans out into many serial GitHub calls. Under
// secondary rate-limiting a single request can hang for 20s+, so bound it and
// fail fast — the client keeps its last-known status and a later poll fills it.
const PR_STATUS_RESOLVE_TIMEOUT_MS = 12_000;
const PR_CONTEXT_CACHE_TTL_MS = 30_000;
const PR_CONTEXT_CACHE_MAX_ENTRIES = 50;

interface PrStatusCacheEntry {
  data: Record<string, unknown>;
  fetchedAt: number;
}

const prStatusCache = new Map<string, PrStatusCacheEntry>();

interface PrContextCacheEntry {
  data: Record<string, unknown>;
  includeCheckDetails: boolean;
  fetchedAt: number;
}

const prContextCache = new Map<string, PrContextCacheEntry>();

function setPrStatusCache(
  key: string,
  data: Record<string, unknown>,
  fetchedAt: number,
): void {
  if (
    prStatusCache.size >= PR_STATUS_CACHE_MAX_ENTRIES &&
    !prStatusCache.has(key)
  ) {
    const oldest = prStatusCache.keys().next().value;
    if (oldest !== undefined) prStatusCache.delete(oldest);
  }
  prStatusCache.set(key, { data, fetchedAt });
}

function prContextKey(
  directory: string,
  number: number,
  includeDiff: boolean,
  requested: { owner: string; repo: string } | null,
): string {
  return JSON.stringify([
    directory,
    number,
    includeDiff,
    requested ? `${requested.owner}/${requested.repo}` : null,
  ]);
}

/**
 * Drops cached PR context for a directory, optionally narrowed to one PR.
 * Called after update/merge/ready so the next read is not served from cache.
 */
function invalidatePrContextCache(directory: string, number?: number): void {
  for (const key of prContextCache.keys()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(key);
    } catch {
      prContextCache.delete(key);
      continue;
    }
    if (!Array.isArray(parsed)) continue;
    const [cachedDirectory, cachedNumber] = parsed;
    if (
      cachedDirectory === directory &&
      (number == null || cachedNumber === number)
    ) {
      prContextCache.delete(key);
    }
  }
}

async function requireOctokit(): Promise<Octokit> {
  const octokit = await getOctokitOrNull();
  if (!octokit) throw new GitHubNotConnectedError();
  return octokit;
}

/**
 * `ghCli` describes whether an already-authenticated GitHub CLI can be used as
 * a credential. It is reported even when disconnected so the UI can offer it as
 * an alternative to the device flow.
 */
function buildGhCliState(
  available: boolean,
  disabled: boolean,
  active: boolean,
  user: Awaited<ReturnType<typeof getGitHubUserSummary>> | null,
) {
  return {
    available,
    disabled,
    active,
    ...(!disabled && user ? { user } : {}),
  };
}

async function resolveGhCliUser(): Promise<{
  available: boolean;
  disabled: boolean;
  user: Awaited<ReturnType<typeof getGitHubUserSummary>> | null;
}> {
  const disabled = await isGhCliDisabled();
  const token = disabled ? null : getGhCliToken();
  if (!token) return { available: false, disabled, user: null };

  try {
    return {
      available: true,
      disabled,
      user: await getGitHubUserSummary(createOctokit(token)),
    };
  } catch {
    // gh is installed but not authenticated, or its token is dead.
    return { available: false, disabled, user: null };
  }
}

/** Strips `remote/`, `heads/`, and `refs/heads/` prefixes from a branch ref. */
function normalizeBranchRef(value: string, remoteNames: Set<string>): string {
  let normalized = value.trim();
  if (!normalized) return normalized;
  for (const prefix of ['refs/heads/', 'heads/', 'remotes/']) {
    if (normalized.startsWith(prefix)) {
      normalized = normalized.slice(prefix.length);
      break;
    }
  }
  const slashIndex = normalized.indexOf('/');
  if (slashIndex > 0 && remoteNames.has(normalized.slice(0, slashIndex))) {
    const withoutRemote = normalized.slice(slashIndex + 1).trim();
    if (withoutRemote) normalized = withoutRemote;
  }
  return normalized;
}

const github = new Hono()
  .onError((err, c) => {
    if (err instanceof GitHubNotConnectedError) {
      return c.json({ code: err.code, message: err.message }, 401);
    }
    if (err instanceof GitHubAuthInvalidError) {
      return c.json({ code: err.code, message: err.message }, 401);
    }
    if (err instanceof GitHubRepoNotFoundError) {
      return c.json({ code: err.code, message: err.message }, 404);
    }
    console.error('[github]', err);
    return c.json(
      { code: 'INTERNAL_SERVER_ERROR', message: 'GitHub operation failed' },
      500,
    );
  })

  // ----- Auth status -----
  .get('/auth/status', async (c) => {
    const auth = getGitHubAuth();
    let accounts = getGitHubAuthAccounts();
    const usingOwnToken = Boolean(auth?.accessToken);

    const ghCli = await resolveGhCliUser();
    const ghCliDisabled = ghCli.disabled;
    let ghCliActive = await isGhCliActive();
    if (ghCliActive && !ghCli.user) ghCliActive = false;

    // Prefer the gh CLI token when the user asked for it, or when they have no
    // device-flow token at all.
    const ghCliCurrent =
      ghCli.available &&
      !ghCliDisabled &&
      Boolean(ghCli.user) &&
      (ghCliActive || !usingOwnToken);
    if (ghCliActive && !ghCli.user) await setGhCliActive(false);

    if (ghCli.user) {
      accounts = [
        ...accounts.map((account) => ({
          ...account,
          current: ghCliCurrent ? false : account.current,
        })),
        {
          id: GH_CLI_ACCOUNT_ID,
          user: ghCli.user,
          scope: '',
          current: ghCliCurrent,
          source: 'gh-cli' as const,
        },
      ];
    }

    const ghCliState = buildGhCliState(
      ghCli.available,
      ghCliDisabled,
      ghCliCurrent,
      ghCliCurrent ? ghCli.user : null,
    );

    const octokit = await getOctokitOrNull();
    if (!octokit) {
      return c.json({ connected: false, accounts, ghCli: ghCliState });
    }

    let user: Awaited<ReturnType<typeof getGitHubUserSummary>> | null = null;
    try {
      user = await getGitHubUserSummary(octokit);
    } catch (error) {
      if (isAuthInvalid(error)) {
        if (usingOwnToken) clearGitHubAuth();
        return c.json({
          connected: false,
          accounts: getGitHubAuthAccounts(),
          ghCli: ghCliState,
        });
      }
    }

    const merged = user ?? (usingOwnToken ? (auth?.user ?? null) : null);
    return c.json({
      connected: true,
      user: merged,
      scope: ghCliCurrent ? undefined : auth?.scope,
      accounts,
      ghCli: ghCliState,
    });
  })

  // ----- gh CLI: enable/disable -----
  .post(
    '/auth/gh-cli',
    zValidator('json', githubGhCliBodySchema),
    async (c) => {
      const { disabled } = c.req.valid('json');
      await setGhCliDisabled(disabled);
      clearGhCliTokenCache();
      return c.json({ disabled: await isGhCliDisabled() });
    },
  )

  // ----- Device flow: start -----
  .post(
    '/auth/start',
    zValidator('json', githubDeviceFlowStartBodySchema),
    async (c) => {
      const clientId = await getGitHubClientId();
      if (!clientId) {
        return c.json(
          {
            error:
              'GitHub OAuth client not configured. Set AERO_GITHUB_CLIENT_ID.',
          },
          400,
        );
      }
      const scope = await getGitHubScopes();
      const payload = await startDeviceFlow({ clientId, scope });
      return c.json({
        deviceCode: payload.device_code,
        userCode: payload.user_code,
        verificationUri: payload.verification_uri,
        verificationUriComplete: payload.verification_uri_complete,
        expiresIn: payload.expires_in,
        interval: payload.interval,
        scope,
      });
    },
  )

  // ----- Device flow: complete -----
  .post(
    '/auth/complete',
    zValidator('json', githubDeviceFlowCompleteBodySchema),
    async (c) => {
      const { deviceCode } = c.req.valid('json');
      const clientId = await getGitHubClientId();
      if (!clientId) {
        return c.json(
          {
            error:
              'GitHub OAuth client not configured. Set AERO_GITHUB_CLIENT_ID.',
          },
          400,
        );
      }

      const payload = await exchangeDeviceCode({ clientId, deviceCode });

      // GitHub answers 200 with an `error` field while the user has not yet
      // approved, so this is a normal pending state, not a failure.
      if (payload.error) {
        return c.json({
          connected: false,
          status: payload.error,
          error: payload.error_description || payload.error,
        });
      }

      const accessToken = payload.access_token;
      if (!accessToken) {
        return c.json({ error: 'Missing access_token from GitHub' }, 500);
      }

      const user = await getGitHubUserSummary(createOctokit(accessToken));
      setGitHubAuth({
        accessToken,
        scope: typeof payload.scope === 'string' ? payload.scope : '',
        tokenType:
          typeof payload.token_type === 'string'
            ? payload.token_type
            : 'bearer',
        user,
      });

      return c.json({
        connected: true,
        user,
        scope: typeof payload.scope === 'string' ? payload.scope : '',
        accounts: getGitHubAuthAccounts(),
      });
    },
  )

  // ----- Activate account -----
  .post(
    '/auth/activate',
    zValidator('json', githubActivateBodySchema),
    async (c) => {
      const { accountId } = c.req.valid('json');

      if (accountId === GH_CLI_ACCOUNT_ID) {
        const ghCli = await resolveGhCliUser();
        if (!ghCli.user) {
          return c.json({ error: 'GitHub CLI account not found' }, 404);
        }
        await setGhCliActive(true);
        return c.json({
          connected: true,
          user: ghCli.user,
          accounts: [
            ...getGitHubAuthAccounts().map((account) => ({
              ...account,
              current: false,
            })),
            {
              id: GH_CLI_ACCOUNT_ID,
              user: ghCli.user,
              scope: '',
              current: true,
              source: 'gh-cli' as const,
            },
          ],
          ghCli: buildGhCliState(true, false, true, ghCli.user),
        });
      }

      const activated = activateGitHubAuth(accountId);
      if (!activated) {
        return c.json({ error: 'GitHub account not found' }, 404);
      }

      const auth = getGitHubAuth();
      const accounts = getGitHubAuthAccounts();
      if (!auth?.accessToken) {
        return c.json({ connected: false, accounts });
      }

      const ghCli = await resolveGhCliUser();
      const allAccounts = ghCli.user
        ? [
            ...accounts.map((account) => ({ ...account, current: false })),
            {
              id: GH_CLI_ACCOUNT_ID,
              user: ghCli.user,
              scope: '',
              current: false,
              source: 'gh-cli' as const,
            },
          ]
        : accounts;

      const octokit = await getOctokitOrNull();
      if (!octokit) {
        return c.json({
          connected: false,
          accounts: allAccounts,
          ghCli: buildGhCliState(
            ghCli.available,
            ghCli.disabled,
            false,
            ghCli.user,
          ),
        });
      }

      let user: Awaited<ReturnType<typeof getGitHubUserSummary>> | null = null;
      try {
        user = await getGitHubUserSummary(octokit);
      } catch (error) {
        if (isAuthInvalid(error)) {
          clearGitHubAuth();
          return c.json({
            connected: false,
            accounts: getGitHubAuthAccounts(),
          });
        }
      }

      return c.json({
        connected: true,
        user,
        scope: auth.scope,
        accounts: allAccounts,
        ghCli: buildGhCliState(
          ghCli.available,
          ghCli.disabled,
          false,
          ghCli.user,
        ),
      });
    },
  )

  // ----- Disconnect -----
  .delete('/auth', (c) => c.json({ success: true, removed: clearGitHubAuth() }))

  // ----- Current user -----
  .get('/me', async (c) => {
    const octokit = await requireOctokit();
    try {
      return c.json(await getGitHubUserSummary(octokit));
    } catch (error) {
      if (isAuthInvalid(error)) {
        clearGitHubAuth();
        throw new GitHubAuthInvalidError();
      }
      throw error;
    }
  })

  // ----- PR status -----
  .get(
    '/pr/status',
    zValidator('query', githubPrStatusQuerySchema),
    async (c) => {
      const { directory, branch, remote, force } = c.req.valid('query');
      const cacheKey = `${directory}::${branch}::${remote ?? 'origin'}`;
      const cached = prStatusCache.get(cacheKey);

      if (
        !force &&
        cached &&
        Date.now() - cached.fetchedAt < PR_STATUS_CACHE_TTL_MS
      ) {
        return c.json(cached.data);
      }

      // If GitHub recently rate-limited us, don't pile on more calls that will
      // also fail. Serve the last cached status even if stale.
      if (isGitHubRateLimited()) {
        if (cached) return c.json(cached.data);
        return c.json({ error: 'GitHub rate limited' }, 503);
      }

      const octokit = await getOctokitOrNull();
      if (!octokit) return c.json({ connected: false });

      try {
        const resolved = await withTimeout(
          resolveGitHubPrStatus({
            octokit,
            directory,
            branch,
            remoteName: remote,
            force,
          }),
          PR_STATUS_RESOLVE_TIMEOUT_MS,
          'resolveGitHubPrStatus',
        );

        const searchRepo = resolved.repo;
        const first = resolved.pr;

        if (!searchRepo) {
          return c.json({
            connected: true,
            repo: null,
            branch,
            pr: null,
            checks: null,
            canMerge: false,
            defaultBranch: null,
            resolvedRemoteName: null,
          });
        }

        if (!first) {
          return c.json({
            connected: true,
            repo: searchRepo,
            branch,
            pr: null,
            checks: null,
            canMerge: false,
            defaultBranch: resolved.defaultBranch,
            resolvedRemoteName: resolved.resolvedRemoteName,
          });
        }

        // pulls.list omits mergeable/mergeable_state, so fetch the full PR.
        const prFull = await octokit.rest.pulls.get({
          owner: searchRepo.owner,
          repo: searchRepo.repo,
          pull_number: first.number,
        });
        const prData = prFull?.data;
        if (!prData) {
          return c.json({
            connected: true,
            repo: searchRepo,
            branch,
            pr: null,
            checks: null,
            canMerge: false,
          });
        }

        const state = resolvePullRequestState(prData);
        // A closed/merged PR is history: its checks are not actionable and it
        // can never be merged from here, so skip the extra calls those need.
        const isHistorical = state !== 'open';

        let checks = null;
        const sha = prData.head?.sha;
        if (sha && !isHistorical) {
          checks = (await fetchChecksForRef(octokit, searchRepo, sha)).checks;
        }

        const canMerge = isHistorical
          ? false
          : await resolveCanMerge(octokit, searchRepo);

        const fetchedAt = Date.now();
        const data = {
          connected: true,
          repo: searchRepo,
          branch,
          pr: {
            number: prData.number,
            title: prData.title,
            body: prData.body || '',
            url: prData.html_url,
            state,
            draft: Boolean(prData.draft),
            base: prData.base?.ref,
            head: prData.head?.ref,
            headSha: prData.head?.sha,
            mergeable: prData.mergeable ?? null,
            mergeableState: prData.mergeable_state ?? null,
            author: mapAuthor(prData.user),
            createdAt: prData.created_at ?? null,
            updatedAt: prData.updated_at ?? null,
            headRepo: mapHeadRepo(prData),
          },
          checks,
          canMerge,
          defaultBranch: resolved.defaultBranch,
          resolvedRemoteName: resolved.resolvedRemoteName,
          // Travels with the payload so a cached serve can never overwrite
          // fresher client state.
          fetchedAt,
        };

        setPrStatusCache(cacheKey, data, fetchedAt);
        return c.json(data);
      } catch (error) {
        if ((error as { status?: number })?.status === 401) {
          clearGitHubAuth();
          return c.json({ connected: false });
        }

        // A rate limit or the resolve timeout is expected under load. Record a
        // cooldown and serve the last known status so the client does not drop
        // the badge.
        const wasRateLimited = noteIfGitHubRateLimit(error);
        const wasTimeout = (error as { code?: string })?.code === 'ETIMEDOUT';
        if (wasRateLimited || wasTimeout) {
          if (cached) return c.json(cached.data);
          return c.json(
            {
              error: wasRateLimited
                ? 'GitHub rate limited'
                : 'GitHub request timed out',
            },
            503,
          );
        }

        if (isResourceUnavailable(error)) {
          return c.json({
            connected: true,
            repo: null,
            branch,
            pr: null,
            checks: null,
            canMerge: false,
            defaultBranch: null,
            resolvedRemoteName: null,
          });
        }

        throw error;
      }
    },
  )

  // ----- Create PR -----
  .post(
    '/pr/create',
    zValidator('json', githubPrCreateBodySchema),
    async (c) => {
      const body = c.req.valid('json');
      const octokit = await requireOctokit();
      const {
        directory,
        title,
        head,
        base,
        body: prBody,
        draft,
        remote,
        headRemote,
      } = body;

      const repo = body.targetRepo
        ? { owner: body.targetRepo.owner, repo: body.targetRepo.repo }
        : await (async () => {
            const resolved = await resolveGitHubRepoFromDirectory(
              directory,
              remote,
            );
            return resolved.repo
              ? { owner: resolved.repo.owner, repo: resolved.repo.repo }
              : null;
          })();

      if (!repo) {
        return c.json(
          { error: 'Unable to resolve GitHub repo from git remote' },
          400,
        );
      }

      // Which remote actually holds the head branch. Priority: explicit
      // headRemote, the branch's tracking remote, then origin when targeting
      // something else (the fork case).
      let sourceRemote = headRemote;
      if (!sourceRemote) {
        const tracking = await getTrackingBranch(directory).catch(() => null);
        const trackingRemote = normalizeText(tracking).split('/')[0];
        if (trackingRemote) sourceRemote = trackingRemote;
      }
      if (!sourceRemote && remote !== 'origin') sourceRemote = 'origin';

      const remoteNames = new Set<string>([
        remote,
        ...(sourceRemote ? [sourceRemote] : []),
      ]);
      for (const item of await getRemotes(directory).catch(() => [])) {
        if (item?.name) remoteNames.add(item.name);
      }

      const normalizedBase = normalizeBranchRef(base, remoteNames);
      if (!normalizedBase) {
        return c.json({ error: 'Invalid base branch name' }, 400);
      }

      let headRef = head;
      let headRepo: { owner: string; repo: string } | null = null;

      if (sourceRemote) {
        const resolved = await resolveGitHubRepoFromDirectory(
          directory,
          sourceRemote,
        );
        headRepo = resolved.repo
          ? { owner: resolved.repo.owner, repo: resolved.repo.repo }
          : null;
        if (!headRepo) {
          return c.json(
            {
              error: `Cannot resolve GitHub repo for remote "${sourceRemote}". Check that the remote URL is a valid GitHub repository.`,
            },
            400,
          );
        }
        // GitHub requires `owner:branch` when the head lives in a different repo.
        if (headRepo.owner !== repo.owner || headRepo.repo !== repo.repo) {
          headRef = `${headRepo.owner}:${head}`;
        }
      }

      // A cross-repo PR against a branch that was never pushed fails with an
      // opaque validation error, so check first and say what to do.
      if (headRef.includes(':') && headRepo) {
        try {
          await octokit.rest.repos.getBranch({
            owner: headRepo.owner,
            repo: headRepo.repo,
            branch: head,
          });
        } catch (error) {
          if ((error as { status?: number })?.status === 404) {
            return c.json(
              {
                error: `Branch "${head}" not found on ${headRepo.owner}/${headRepo.repo}. Push it first: git push ${sourceRemote || 'origin'} ${head}`,
              },
              400,
            );
          }
          // Other failures are more informative from the create call itself.
        }
      }

      try {
        const created = await octokit.rest.pulls.create({
          owner: repo.owner,
          repo: repo.repo,
          title,
          head: headRef,
          base: normalizedBase,
          ...(typeof prBody === 'string' ? { body: prBody } : {}),
          ...(typeof draft === 'boolean' ? { draft } : {}),
        });

        const pr = created?.data;
        if (!pr) return c.json({ error: 'Failed to create PR' }, 500);

        const headBranch = headRef.includes(':')
          ? headRef.split(':')[1] || head
          : head;
        prStatusCache.delete(`${directory}::${headBranch}::${remote}`);
        invalidateRepoPullsCache(repo.owner, repo.repo);

        return c.json(shapePullRequest(pr));
      } catch (error) {
        const message = (error as { message?: string })?.message ?? '';
        // GitHub reports "you don't have write access to the head repo" as a
        // field validation error, which is nearly always an unpushed branch.
        if (
          message.includes('Validation Failed') &&
          message.includes('"field":"head"') &&
          message.includes('"code":"invalid"')
        ) {
          return c.json(
            {
              error:
                'Unable to create PR: you need write access to the source repository. Make sure the branch is pushed to a repository you own (your fork).',
            },
            400,
          );
        }
        throw error;
      }
    },
  )

  // ----- Update PR -----
  .post(
    '/pr/update',
    zValidator('json', githubPrUpdateBodySchema),
    async (c) => {
      const { directory, number, title, body: prBody } = c.req.valid('json');
      const octokit = await requireOctokit();
      const repo = await requireRepoForDirectory(octokit, directory, null);

      try {
        const updated = await octokit.rest.pulls.update({
          owner: repo.owner,
          repo: repo.repo,
          pull_number: number,
          title,
          ...(typeof prBody === 'string' ? { body: prBody } : {}),
        });
        const pr = updated?.data;
        if (!pr) return c.json({ error: 'Failed to update PR' }, 500);
        invalidatePrContextCache(directory, number);
        return c.json(shapePullRequest(pr));
      } catch (error) {
        return c.json(
          githubWriteError(error, {
            401: 'GitHub not connected',
            403: 'Not authorized to edit this PR',
            404: 'PR not found in this repository',
          }),
          statusForGitHubError(error, 500),
        );
      }
    },
  )

  // ----- Merge PR -----
  .post('/pr/merge', zValidator('json', githubPrMergeBodySchema), async (c) => {
    const { directory, number, method } = c.req.valid('json');
    const octokit = await requireOctokit();
    const repo = await requireRepoForDirectory(octokit, directory, null);

    try {
      const result = await octokit.rest.pulls.merge({
        owner: repo.owner,
        repo: repo.repo,
        pull_number: number,
        merge_method: method,
      });
      invalidatePrContextCache(directory, number);
      invalidateRepoPullsCache(repo.owner, repo.repo);
      return c.json({
        merged: Boolean(result?.data?.merged),
        message: result?.data?.message,
      });
    } catch (error) {
      const status = (error as { status?: number })?.status;
      if (status === 403) {
        return c.json({ error: 'Not authorized to merge this PR' }, 403);
      }
      // 405/409 mean "not currently mergeable" (conflicts, required checks).
      // That is a normal answer to the question, not a server failure.
      if (status === 405 || status === 409) {
        return c.json({
          merged: false,
          message:
            (error as { message?: string })?.message || 'PR not mergeable',
        });
      }
      throw error;
    }
  })

  // ----- Mark ready for review -----
  .post(
    '/pr/ready',
    zValidator('json', githubPrNumberBodySchema),
    async (c) => {
      const { directory, number } = c.req.valid('json');
      const octokit = await requireOctokit();
      const repo = await requireRepoForDirectory(octokit, directory, null);

      const pr = await octokit.rest.pulls.get({
        owner: repo.owner,
        repo: repo.repo,
        pull_number: number,
      });
      if (pr?.data?.draft === false) return c.json({ ready: true });

      const nodeId = pr?.data?.node_id;
      if (!nodeId) {
        return c.json({ error: 'Failed to resolve PR node id' }, 500);
      }

      try {
        await octokit.graphql(
          `mutation($pullRequestId: ID!) {
  markPullRequestReadyForReview(input: { pullRequestId: $pullRequestId }) {
    pullRequest { id isDraft }
  }
}`,
          { pullRequestId: nodeId },
        );
      } catch (error) {
        if ((error as { status?: number })?.status === 403) {
          return c.json({ error: 'Not authorized to mark PR ready' }, 403);
        }
        throw error;
      }

      invalidatePrContextCache(directory, number);
      invalidateRepoPullsCache(repo.owner, repo.repo);
      return c.json({ ready: true });
    },
  )

  // ----- Generate title/body from the branch -----
  // Does not touch GitHub: this only reads git and asks the model to write prose.
  .post(
    '/pr/describe',
    zValidator('json', githubPrDescribeBodySchema),
    async (c) => {
      const body = c.req.valid('json');
      try {
        return c.json(await describePullRequest(body));
      } catch (error) {
        return c.json(
          {
            error:
              (error as { message?: string })?.message ||
              'Failed to generate pull request description',
          },
          400,
        );
      }
    },
  )

  // ----- Repo: upstream detection -----
  .get(
    '/repo/upstream',
    zValidator('query', githubUpstreamQuerySchema),
    async (c) => {
      const { directory } = c.req.valid('query');
      const octokit = await getOctokitOrNull();
      if (!octokit) {
        return c.json({ connected: false, isFork: false, upstream: null });
      }

      const network = await resolveRepoNetwork(octokit, directory);
      if (!network || network.length <= 1) {
        return c.json({ connected: true, isFork: false, upstream: null });
      }

      const upstream = network.find((entry) => entry.source === 'upstream');
      if (!upstream) {
        return c.json({ connected: true, isFork: false, upstream: null });
      }

      let defaultBranch = 'main';
      let defaultBranchSha: string | null = null;
      try {
        const metadata = await octokit.rest.repos.get({
          owner: upstream.owner,
          repo: upstream.repo,
        });
        defaultBranch = metadata?.data?.default_branch || 'main';
        const ref = await octokit.rest.git.getRef({
          owner: upstream.owner,
          repo: upstream.repo,
          ref: `heads/${defaultBranch}`,
        });
        defaultBranchSha = ref?.data?.object?.sha ?? null;
      } catch (error) {
        noteIfGitHubRateLimit(error);
      }

      // Match the upstream repo against a configured remote so the UI can
      // offer it as a target by name.
      let upstreamRemoteName: string | null = null;
      for (const remote of await getRemotes(directory).catch(() => [])) {
        if (!remote?.name) continue;
        const parsed = parseGitHubRemoteUrl(remote.refs?.fetch);
        if (parsed?.owner === upstream.owner && parsed.repo === upstream.repo) {
          upstreamRemoteName = remote.name;
          break;
        }
      }

      return c.json({
        connected: true,
        isFork: true,
        upstream: {
          owner: upstream.owner,
          repo: upstream.repo,
          url: upstream.url,
          defaultBranch,
          defaultBranchSha,
          remoteName: upstreamRemoteName,
        },
      });
    },
  )

  // ----- Repo: branches -----
  .get(
    '/repo/branches',
    zValidator('query', githubBranchesQuerySchema),
    async (c) => {
      const { owner, repo } = c.req.valid('query');
      const octokit = await getOctokitOrNull();
      if (!octokit) return c.json({ branches: [] });

      const branches: string[] = [];
      let page = 1;
      // Paginate fully: a base-branch picker that silently omits branches past
      // the first 100 is worse than a slightly slower request.
      for (;;) {
        const response = await octokit.rest.repos.listBranches({
          owner,
          repo,
          per_page: 100,
          page,
        });
        if (!response.data?.length) break;
        for (const branch of response.data) branches.push(branch.name);
        if (response.data.length < 100) break;
        page++;
      }

      return c.json({ branches });
    },
  )

  // ----- Pull requests: list -----
  .get(
    '/pulls/list',
    zValidator('query', githubRepoListQuerySchema),
    async (c) => {
      const { directory, page, query } = c.req.valid('query');
      const octokit = await getOctokitOrNull();
      if (!octokit) return c.json({ connected: false });

      const { repo } = await resolveGitHubRepoFromDirectory(directory);
      if (!repo) return c.json({ connected: true, repo: null, prs: [] });

      const network = await resolveRepoNetwork(octokit, directory).catch(
        () => null,
      );
      const reposToQuery = network ?? [{ ...repo, source: 'origin' as const }];

      const mapPrSummary = (
        pr: Record<string, unknown>,
        repoRef: { owner: string; repo: string; source: string },
      ) => shapePullRequest(pr, repoRef);

      if (normalizeText(query)) {
        const repoQualifiers = reposToQuery
          .map((entry) => `repo:${entry.owner}/${entry.repo}`)
          .join(' ');
        try {
          const searchResult = await octokit.rest.search.issuesAndPullRequests({
            q: `${repoQualifiers} ${query} type:pr state:open`,
            per_page: 50,
            page,
          });
          const totalCount = searchResult.data.total_count;
          const items = Array.isArray(searchResult.data.items)
            ? searchResult.data.items
            : [];

          const prs = await Promise.all(
            items.map(async (item) => {
              const fullName = (item.repository_url || '').replace(
                'https://api.github.com/repos/',
                '',
              );
              const [owner, repoName] = fullName.split('/');
              // Search results omit mergeable/draft, so hydrate each one.
              const detail = await octokit.rest.pulls.get({
                owner,
                repo: repoName,
                pull_number: item.number,
              });
              const matched =
                reposToQuery.find(
                  (entry) => `${entry.owner}/${entry.repo}` === fullName,
                ) ?? reposToQuery[0];
              return mapPrSummary(detail.data as Record<string, unknown>, {
                owner: matched.owner,
                repo: matched.repo,
                source: matched.source,
              });
            }),
          );

          return c.json({
            connected: true,
            repo,
            prs,
            page,
            hasMore: (page - 1) * 50 + items.length < totalCount,
          });
        } catch (error) {
          noteIfGitHubRateLimit(error);
          console.error('[github] failed to search pull requests:', error);
          return c.json({
            connected: true,
            repo,
            prs: [],
            page,
            hasMore: false,
          });
        }
      }

      const results = await Promise.all(
        reposToQuery.map((repoRef) =>
          safeListForRepo(
            () =>
              octokit.rest.pulls.list({
                owner: repoRef.owner,
                repo: repoRef.repo,
                state: 'open',
                per_page: 50,
                page,
              }),
            `pulls for ${repoRef.owner}/${repoRef.repo}`,
          ).then((result) => ({
            prs: result.items.map((pr) =>
              mapPrSummary(pr as Record<string, unknown>, repoRef),
            ),
            hasMore: result.hasMore,
          })),
        ),
      );

      return c.json({
        connected: true,
        repo,
        prs: results.flatMap((result) => result.prs),
        page,
        hasMore: results.some((result) => result.hasMore),
      });
    },
  )

  // ----- Pull request: full context -----
  .get(
    '/pulls/context',
    zValidator('query', githubRepoItemQuerySchema),
    async (c) => {
      const {
        directory,
        number,
        diff: includeDiff,
        checkDetails: includeCheckDetails,
      } = c.req.valid('query');

      const requested = (() => {
        const owner = c.req.query('owner');
        const repo = c.req.query('repo');
        return owner && repo ? { owner, repo } : null;
      })();

      const cacheKey = prContextKey(directory, number, includeDiff, requested);
      const cached = prContextCache.get(cacheKey);
      if (
        cached &&
        Date.now() - cached.fetchedAt < PR_CONTEXT_CACHE_TTL_MS &&
        // A detail-inclusive entry satisfies a detail-free request, not vice versa.
        (cached.includeCheckDetails || !includeCheckDetails)
      ) {
        return c.json(cached.data);
      }

      const octokit = await getOctokitOrNull();
      if (!octokit) return c.json({ connected: false });

      const repo = await resolveRepoForRequest(octokit, directory, requested);
      if (!repo) return c.json({ connected: true, repo: null, pr: null });

      const prFull = await octokit.rest.pulls.get({
        owner: repo.owner,
        repo: repo.repo,
        pull_number: number,
      });
      const prData = prFull?.data;
      if (!prData) return c.json({ error: 'PR not found' }, 404);

      const [issueComments, reviewComments, files] = await Promise.all([
        octokit.rest.issues
          .listComments({
            owner: repo.owner,
            repo: repo.repo,
            issue_number: number,
            per_page: 100,
          })
          .then((response) =>
            Array.isArray(response?.data) ? response.data : [],
          )
          .catch(() => []),
        octokit.rest.pulls
          .listReviewComments({
            owner: repo.owner,
            repo: repo.repo,
            pull_number: number,
            per_page: 100,
          })
          .then((response) =>
            Array.isArray(response?.data) ? response.data : [],
          )
          .catch(() => []),
        octokit.rest.pulls
          .listFiles({
            owner: repo.owner,
            repo: repo.repo,
            pull_number: number,
            per_page: 100,
          })
          .then((response) =>
            Array.isArray(response?.data) ? response.data : [],
          )
          .catch(() => []),
      ]);

      let checks = null;
      let checkRuns: CheckRunDetail[] = [];
      const sha = prData.head?.sha;
      if (sha) {
        const result = await fetchChecksForRef(octokit, repo, sha, {
          includeDetails: includeCheckDetails,
        });
        checks = result.checks;
        checkRuns = result.runs;
      }

      let diff: string | undefined;
      if (includeDiff) {
        try {
          const diffResponse = await octokit.request(
            'GET /repos/{owner}/{repo}/pulls/{pull_number}',
            {
              owner: repo.owner,
              repo: repo.repo,
              pull_number: number,
              headers: { accept: 'application/vnd.github.v3.diff' },
            },
          );
          if (typeof diffResponse?.data === 'string') {
            diff = diffResponse.data;
          }
        } catch (error) {
          noteIfGitHubRateLimit(error);
        }
      }

      const fetchedAt = Date.now();
      const data = {
        connected: true,
        repo,
        pr: {
          ...shapePullRequest(prData, { ...repo, source: 'origin' }),
          body: prData.body || '',
          createdAt: prData.created_at ?? null,
          updatedAt: prData.updated_at ?? null,
        },
        issueComments: issueComments.map((comment) => ({
          id: comment.id,
          url: comment.html_url,
          body: comment.body || '',
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          author: mapAuthor(comment.user),
        })),
        reviewComments: reviewComments.map((comment) => ({
          id: comment.id,
          url: comment.html_url,
          body: comment.body || '',
          createdAt: comment.created_at,
          updatedAt: comment.updated_at,
          path: comment.path,
          line: comment.line ?? null,
          position: comment.position ?? null,
          author: mapAuthor(comment.user),
        })),
        files: files.map((file) => ({
          filename: file.filename,
          status: file.status,
          additions: file.additions,
          deletions: file.deletions,
          changes: file.changes,
          patch: file.patch,
        })),
        ...(diff !== undefined ? { diff } : {}),
        checks,
        ...(checkRuns.length > 0 ? { checkRuns } : {}),
        fetchedAt,
      };

      if (prContextCache.size >= PR_CONTEXT_CACHE_MAX_ENTRIES) {
        const oldest = prContextCache.keys().next().value;
        if (oldest !== undefined) prContextCache.delete(oldest);
      }
      prContextCache.set(cacheKey, {
        data,
        includeCheckDetails,
        fetchedAt,
      });

      return c.json(data);
    },
  )

  // ----- Issues: list -----
  .get(
    '/issues/list',
    zValidator('query', githubRepoListQuerySchema),
    async (c) => {
      const { directory, page, query } = c.req.valid('query');
      const octokit = await getOctokitOrNull();
      if (!octokit) return c.json({ connected: false });

      const { repo } = await resolveGitHubRepoFromDirectory(directory);
      if (!repo) return c.json({ connected: true, repo: null, issues: [] });

      const network = await resolveRepoNetwork(octokit, directory).catch(
        () => null,
      );
      const reposToQuery = network ?? [{ ...repo, source: 'origin' as const }];

      const mapIssueSummary = (
        item: Record<string, unknown>,
        repoRef: { owner: string; repo: string; source: string },
      ) => ({
        number: item.number as number,
        title: item.title as string,
        url: item.html_url as string,
        state:
          item.state === 'closed' ? ('closed' as const) : ('open' as const),
        author: mapAuthor(item.user),
        labels: mapLabels(item.labels),
        sourceRepo: {
          owner: repoRef.owner,
          repo: repoRef.repo,
          source: repoRef.source,
        },
      });

      if (normalizeText(query)) {
        const repoQualifiers = reposToQuery
          .map((entry) => `repo:${entry.owner}/${entry.repo}`)
          .join(' ');
        try {
          const searchResult = await octokit.rest.search.issuesAndPullRequests({
            q: `${repoQualifiers} ${query} type:issue state:open`,
            per_page: 50,
            page,
          });
          const totalCount = searchResult.data.total_count;
          const items = Array.isArray(searchResult.data.items)
            ? searchResult.data.items
            : [];
          // The issues endpoint returns PRs too; drop them.
          const issues = items
            .filter((item) => !item?.pull_request)
            .map((item) => {
              const fullName = (item.repository_url || '').replace(
                'https://api.github.com/repos/',
                '',
              );
              const matched =
                reposToQuery.find(
                  (entry) => `${entry.owner}/${entry.repo}` === fullName,
                ) ?? reposToQuery[0];
              return mapIssueSummary(item, matched);
            });
          return c.json({
            connected: true,
            repo,
            issues,
            page,
            hasMore: (page - 1) * 50 + items.length < totalCount,
          });
        } catch (error) {
          noteIfGitHubRateLimit(error);
          return c.json({
            connected: true,
            repo,
            issues: [],
            page,
            hasMore: false,
          });
        }
      }

      const results = await Promise.all(
        reposToQuery.map((repoRef) =>
          safeListForRepo(
            () =>
              octokit.rest.issues.listForRepo({
                owner: repoRef.owner,
                repo: repoRef.repo,
                state: 'open',
                per_page: 50,
                page,
              }),
            `issues for ${repoRef.owner}/${repoRef.repo}`,
          ).then((result) => ({
            issues: result.items
              .filter(
                (item) => !(item as { pull_request?: unknown }).pull_request,
              )
              .map((item) =>
                mapIssueSummary(item as Record<string, unknown>, repoRef),
              ),
            hasMore: result.hasMore,
          })),
        ),
      );

      return c.json({
        connected: true,
        repo,
        issues: results.flatMap((result) => result.issues),
        page,
        hasMore: results.some((result) => result.hasMore),
      });
    },
  )

  // ----- Issues: get -----
  .get(
    '/issues/get',
    zValidator('query', githubRepoItemQuerySchema),
    async (c) => {
      const { directory, number } = c.req.valid('query');
      const octokit = await getOctokitOrNull();
      if (!octokit) return c.json({ connected: false });

      const requested = (() => {
        const owner = c.req.query('owner');
        const repo = c.req.query('repo');
        return owner && repo ? { owner, repo } : null;
      })();
      const repo = await resolveRepoForRequest(octokit, directory, requested);
      if (!repo) return c.json({ connected: true, repo: null, issue: null });

      const response = await octokit.rest.issues.get({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: number,
      });
      const issue = response?.data;
      if (!issue || issue.pull_request) {
        return c.json({ error: 'Not a GitHub issue' }, 400);
      }

      return c.json({
        connected: true,
        repo,
        issue: {
          number: issue.number,
          title: issue.title,
          url: issue.html_url,
          state:
            issue.state === 'closed' ? ('closed' as const) : ('open' as const),
          body: issue.body || '',
          createdAt: issue.created_at ?? null,
          updatedAt: issue.updated_at ?? null,
          author: mapAuthor(issue.user),
          assignees: (issue.assignees ?? [])
            .map(mapAuthor)
            .filter(
              (author): author is NonNullable<typeof author> => author !== null,
            ),
          labels: mapLabels(issue.labels),
        },
      });
    },
  )

  // ----- Issues: comments -----
  .get(
    '/issues/comments',
    zValidator('query', githubRepoItemQuerySchema),
    async (c) => {
      const { directory, number } = c.req.valid('query');
      const octokit = await getOctokitOrNull();
      if (!octokit) return c.json({ connected: false });

      const requested = (() => {
        const owner = c.req.query('owner');
        const repo = c.req.query('repo');
        return owner && repo ? { owner, repo } : null;
      })();
      const repo = await resolveRepoForRequest(octokit, directory, requested);
      if (!repo) return c.json({ connected: true, repo: null, comments: [] });

      const response = await octokit.rest.issues.listComments({
        owner: repo.owner,
        repo: repo.repo,
        issue_number: number,
        per_page: 100,
      });

      return c.json({
        connected: true,
        repo,
        comments: (Array.isArray(response?.data) ? response.data : []).map(
          (comment) => ({
            id: comment.id,
            url: comment.html_url,
            body: comment.body || '',
            createdAt: comment.created_at,
            updatedAt: comment.updated_at,
            author: mapAuthor(comment.user),
          }),
        ),
      });
    },
  );

/** Resolves the directory's repo or fails with a 400 naming the directory. */
async function requireRepoForDirectory(
  octokit: Octokit,
  directory: string,
  requested: { owner: string; repo: string } | null,
): Promise<RepoRefResponse> {
  const repo = await resolveRepoForRequest(octokit, directory, requested);
  if (!repo) {
    throw new GitHubRepoNotFoundError(directory);
  }
  return repo;
}

let resolvedAuthLogin: Promise<string | null> | null = null;

/** Resolves (and memoizes) the authenticated login, for permission lookups. */
async function resolveAuthLogin(octokit: Octokit): Promise<string | null> {
  const auth = getGitHubAuth();
  if (auth?.user?.login) return auth.user.login;
  if (!resolvedAuthLogin) {
    resolvedAuthLogin = octokit.rest.users
      .getAuthenticated()
      .then((response) => response?.data?.login || null)
      .catch(() => {
        resolvedAuthLogin = null;
        return null;
      });
  }
  return resolvedAuthLogin;
}

async function resolveCanMerge(
  octokit: Octokit,
  repo: RepoRefResponse,
): Promise<boolean> {
  try {
    const username = await resolveAuthLogin(octokit);
    if (!username) return false;
    const permission = await octokit.rest.repos.getCollaboratorPermissionLevel({
      owner: repo.owner,
      repo: repo.repo,
      username,
    });
    const level = permission?.data?.permission;
    return level === 'admin' || level === 'maintain' || level === 'write';
  } catch (error) {
    noteIfGitHubRateLimit(error);
    return false;
  }
}

/** The fields the UI reads off a PR, regardless of which Octokit call produced it. */
interface PullRequestLike {
  number: number;
  title: string;
  html_url: string;
  state?: string;
  merged?: boolean;
  merged_at?: string | null;
  draft?: boolean;
  base?: { ref?: string } | null;
  head?: { ref?: string; sha?: string; label?: string; repo?: unknown } | null;
  mergeable?: boolean | null;
  mergeable_state?: string | null;
  user?: unknown;
}

function shapePullRequest(
  pr: unknown,
  sourceRepo?: RepoRefResponse & { source?: string },
) {
  const typed = pr as PullRequestLike;
  return {
    number: typed.number,
    title: typed.title,
    url: typed.html_url,
    state: resolvePullRequestState(typed),
    draft: Boolean(typed.draft),
    base: typed.base?.ref,
    head: typed.head?.ref,
    headSha: typed.head?.sha,
    mergeable: typed.mergeable ?? null,
    mergeableState: typed.mergeable_state ?? null,
    author: mapAuthor(typed.user),
    headLabel: typed.head?.label ?? null,
    headRepo: mapHeadRepo(typed),
    ...(sourceRepo
      ? {
          sourceRepo: {
            owner: sourceRepo.owner,
            repo: sourceRepo.repo,
            source: sourceRepo.source ?? 'origin',
          },
        }
      : {}),
  };
}

function githubWriteError(error: unknown, messages: Record<number, string>) {
  const status = (error as { status?: number })?.status;
  if (status && messages[status]) {
    return { error: messages[status] };
  }
  return {
    error: (error as { message?: string })?.message || 'GitHub request failed',
  };
}

/** Mirrors the upstream status so the client can distinguish it from a 500. */
function statusForGitHubError(
  error: unknown,
  fallback: 400 | 500,
): 401 | 403 | 404 | 422 | 400 | 500 {
  const status = (error as { status?: number })?.status;
  return status === 401 || status === 403 || status === 404 || status === 422
    ? status
    : fallback;
}

export default github;
