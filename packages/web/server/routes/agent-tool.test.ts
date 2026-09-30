import { describe, expect, it } from 'bun:test';

import { createAgentToolRoutes } from '@/server/routes/agent-tool';

function request(
  body: unknown,
  options: { token?: string; loopback?: boolean } = {},
) {
  const routes = createAgentToolRoutes({
    authorize: (token) => token === 'secret',
    isLoopback: () => options.loopback ?? true,
    execute: async () => ({
      schemaVersion: 1,
      ok: true,
      action: 'projects.list',
      data: { projects: [] },
    }),
  });

  const headers: Record<string, string> = {
    'content-type': 'application/json',
  };
  if (options.token !== undefined) {
    headers.authorization = `Bearer ${options.token}`;
  }

  return routes.request('/', {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
}

describe('agent-tool route', () => {
  it('rejects a missing token with 401', async () => {
    const response = await request({ input: { action: 'projects.list' } });
    expect(response.status).toBe(401);
  });

  it('rejects a bad token with 401', async () => {
    const response = await request(
      { input: { action: 'projects.list' } },
      { token: 'wrong' },
    );
    expect(response.status).toBe(401);
  });

  it('rejects a non-loopback caller with 401', async () => {
    const response = await request(
      { input: { action: 'projects.list' } },
      { token: 'secret', loopback: false },
    );
    expect(response.status).toBe(401);
  });

  it('returns the result envelope for an authorized call', async () => {
    const response = await request(
      { input: { action: 'projects.list' } },
      { token: 'secret' },
    );
    expect(response.status).toBe(200);
    const body = (await response.json()) as {
      schemaVersion: number;
      ok: boolean;
    };
    expect(body.schemaVersion).toBe(1);
    expect(body.ok).toBe(true);
  });

  it('treats a malformed body as an empty payload', async () => {
    const routes = createAgentToolRoutes({
      authorize: () => true,
      isLoopback: () => true,
      execute: async (payload) => ({
        schemaVersion: 1,
        ok: true,
        action: 'projects.list',
        data: { received: payload },
      }),
    });

    const response = await routes.request('/', {
      method: 'POST',
      headers: { authorization: 'Bearer anything' },
      body: 'not json',
    });

    expect(response.status).toBe(200);
    const body = (await response.json()) as { ok: boolean };
    expect(body.ok).toBe(true);
  });
});
