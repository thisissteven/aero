// server/adapters/opencode/client.ts

import type { createOpencodeClient } from '@opencode-ai/sdk/v2';

import { opencodePool } from './pool';

type OpencodeClient = ReturnType<typeof createOpencodeClient>;

/**
 * Executes an operation using the best available OpenCode instance from the pool.
 */
export async function withOpencodeClient<T>(
  action: (client: OpencodeClient) => Promise<T>,
): Promise<T> {
  return opencodePool.execute((client) => action(client));
}

/**
 * Fallback direct client getter (acquires least-busy node).
 */
export async function getOpencodeClient(): Promise<OpencodeClient> {
  const node = await opencodePool.getNode();
  return node.client;
}
