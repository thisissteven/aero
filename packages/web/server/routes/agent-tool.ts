// server/routes/agent-tool.ts
//
// Callback endpoint for the managed `aero` OpenCode tool. OpenCode runs the
// plugin materialized by adapters/opencode/plugin.ts; the plugin POSTs here.
// The route only authenticates, parses, and envelopes — the action dispatch
// lives in services/agent-tool.ts.

import { type Context, Hono } from 'hono';

import { opencodePool } from '@/server/adapters/opencode/pool';
import {
  type AgentToolResult,
  executeAgentToolRequest,
} from '@/server/services/agent-tool';

export interface AgentToolRouteDeps {
  authorize: (token: string) => boolean;
  execute: typeof executeAgentToolRequest;
  isLoopback: (c: Context) => boolean;
}

const WILDCARD_ADDRESSES = new Set(['0.0.0.0', '::']);

function normalizeAddress(value: string): string {
  const address = value.toLowerCase();
  return address.startsWith('::ffff:')
    ? address.slice('::ffff:'.length)
    : address;
}

function isLoopbackAddress(address: string): boolean {
  const normalized = normalizeAddress(address);
  return normalized === '127.0.0.1' || normalized === '::1';
}

/**
 * Same-machine check for the callback. Under Bun the server is handed to Hono
 * as `env`, so `requestIP` gives the peer address. Anything without an address
 * (non-Bun hosts, tests) is allowed through — the per-process bearer token is
 * the primary gate and a wildcard bind still keeps loopback reachable.
 */
function defaultIsLoopback(c: Context): boolean {
  const server = c.env as
    | { requestIP?: (req: Request) => { address?: string } | null }
    | undefined;

  if (!server || typeof server.requestIP !== 'function') return true;

  try {
    const address = server.requestIP(c.req.raw)?.address;
    if (!address || WILDCARD_ADDRESSES.has(normalizeAddress(address))) {
      return true;
    }
    return isLoopbackAddress(address);
  } catch {
    return true;
  }
}

export function createAgentToolRoutes(deps: Partial<AgentToolRouteDeps> = {}) {
  const authorize =
    deps.authorize ?? ((token: string) => opencodePool.authorize(token));
  const execute = deps.execute ?? executeAgentToolRequest;
  const isLoopback = deps.isLoopback ?? defaultIsLoopback;

  return new Hono().post('/', async (c) => {
    const header = c.req.header('authorization') ?? '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : '';

    if (!authorize(token)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }
    if (!isLoopback(c)) {
      return c.json({ error: 'Unauthorized' }, 401);
    }

    let payload: unknown = {};
    try {
      payload = await c.req.json();
    } catch {
      payload = {};
    }

    const controller = new AbortController();
    const onAbort = () => controller.abort();
    c.req.raw.signal.addEventListener('abort', onAbort);

    try {
      const result: AgentToolResult = await execute(payload, {
        signal: controller.signal,
      });
      return c.json(result);
    } finally {
      c.req.raw.signal.removeEventListener('abort', onAbort);
    }
  });
}

const agentTool = createAgentToolRoutes();

export default agentTool;
