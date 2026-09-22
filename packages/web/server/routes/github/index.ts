// github.routes.ts
import { zValidator } from '@hono/zod-validator';
import { Hono } from 'hono';
import {
  activateGitHubAuth,
  clearGitHubAuth,
  exchangeDeviceCode,
  GitHubAuthInvalidError,
  GitHubNotConnectedError,
  GitHubRepoNotFoundError,
  getGitHubAuth,
  getGitHubAuthAccounts,
  getGitHubClientId,
  getGitHubScopes,
  getOctokitOrNull,
  githubActivateBodySchema,
  githubAuthStatusQuerySchema,
  githubDeviceFlowExchangeBodySchema,
  githubDeviceFlowStartBodySchema,
  githubPrStatusQuerySchema,
  resolveGitHubPrStatus,
  setGitHubAuth,
  startDeviceFlow,
} from './service';

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
  .get(
    '/auth/status',
    zValidator('query', githubAuthStatusQuerySchema),
    async (c) => {
      const auth = getGitHubAuth();
      const accounts = getGitHubAuthAccounts();
      const octokit = getOctokitOrNull();

      if (!octokit) {
        return c.json({ connected: false, accounts });
      }

      try {
        const me = await octokit.rest.users.getAuthenticated();
        return c.json({
          connected: true,
          accounts,
          user: {
            login: me.data.login,
            id: me.data.id,
            avatarUrl: me.data.avatar_url,
            name: me.data.name ?? null,
            email: me.data.email ?? null,
          },
        });
      } catch (error: any) {
        if (error?.status === 401 || error?.status === 403) {
          clearGitHubAuth();
          return c.json({
            connected: false,
            accounts: getGitHubAuthAccounts(),
          });
        }
        throw error;
      }
    },
  )

  // ----- Current user -----
  .get('/me', async (c) => {
    const octokit = getOctokitOrNull();
    if (!octokit) throw new GitHubNotConnectedError();

    try {
      const me = await octokit.rest.users.getAuthenticated();
      return c.json({
        login: me.data.login,
        id: me.data.id,
        avatarUrl: me.data.avatar_url,
        name: me.data.name ?? null,
        email: me.data.email ?? null,
      });
    } catch (error: any) {
      if (error?.status === 401 || error?.status === 403) {
        clearGitHubAuth();
        throw new GitHubAuthInvalidError();
      }
      throw error;
    }
  })

  // ----- Device flow: start -----
  .post(
    '/device-flow/start',
    zValidator('json', githubDeviceFlowStartBodySchema),
    async (c) => {
      const body = c.req.valid('json');
      const result = await startDeviceFlow({
        clientId: body.clientId ?? getGitHubClientId(),
        scope: body.scope ?? getGitHubScopes(),
      });
      return c.json(result);
    },
  )

  // ----- Device flow: exchange -----
  .post(
    '/device-flow/exchange',
    zValidator('json', githubDeviceFlowExchangeBodySchema),
    async (c) => {
      const { clientId, deviceCode } = c.req.valid('json');
      const token = await exchangeDeviceCode({
        clientId: clientId ?? getGitHubClientId(),
        deviceCode,
      });

      if (token.access_token) {
        const entry = setGitHubAuth({
          accessToken: token.access_token,
          scope: token.scope ?? '',
          tokenType: token.token_type ?? 'bearer',
        });
        return c.json({ connected: true, account: entry });
      }

      return c.json({
        connected: false,
        error: token.error ?? 'authorization_pending',
        errorDescription: token.error_description,
      });
    },
  )

  // ----- Activate account -----
  .post(
    '/auth/activate',
    zValidator('json', githubActivateBodySchema),
    async (c) => {
      const { accountId } = c.req.valid('json');
      const account = activateGitHubAuth(accountId);
      if (!account) {
        return c.json({ error: 'Account not found' }, 404);
      }
      return c.json({ success: true, account });
    },
  )

  // ----- Disconnect -----
  .post('/auth/disconnect', async (c) => {
    clearGitHubAuth();
    return c.json({ success: true });
  })

  // ----- PR status -----
  .get(
    '/pr/status',
    zValidator('query', githubPrStatusQuerySchema),
    async (c) => {
      const { directory, branch, remote } = c.req.valid('query');
      const octokit = getOctokitOrNull();
      if (!octokit) throw new GitHubNotConnectedError();

      const result = await resolveGitHubPrStatus(
        octokit,
        directory,
        branch,
        remote,
      );
      return c.json(result);
    },
  );

export default github;
