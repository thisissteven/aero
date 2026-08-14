// server/adapters/opencode/client.ts

import type { createOpencodeClient as createOpencodeClientV1 } from '@opencode-ai/sdk';
import type { createOpencodeClient as createOpencodeClientV2 } from '@opencode-ai/sdk/v2';

import { opencodePoolV1, opencodePoolV2 } from './pool';

// Export types for both client versions
export type OpencodeClientV1 = ReturnType<typeof createOpencodeClientV1>;
export type OpencodeClientV2 = ReturnType<typeof createOpencodeClientV2>;

// Convenience alias (defaults to v2 if unversioned)
export type OpencodeClient = OpencodeClientV2;

// ==========================================
// V2 Client Helpers
// ==========================================

/**
 * Executes an operation using the best available OpenCode V2 instance from the pool.
 */
export async function withOpencodeClientV2<T>(
  action: (client: OpencodeClientV2) => Promise<T>,
): Promise<T> {
  return opencodePoolV2.execute((client) => action(client));
}

/**
 * Fallback direct V2 client getter (acquires least-busy node).
 */
export async function getOpencodeClientV2(): Promise<OpencodeClientV2> {
  const node = await opencodePoolV2.getNode();
  return node.client;
}

// Default export aliases to keep existing call sites working seamlessly
export const withOpencodeClient = withOpencodeClientV2;
export const getOpencodeClient = getOpencodeClientV2;

// ==========================================
// V1 Client Helpers
// ==========================================

/**
 * Executes an operation using the best available OpenCode V1 instance from the pool.
 */
export async function withOpencodeClientV1<T>(
  action: (client: OpencodeClientV1) => Promise<T>,
): Promise<T> {
  return opencodePoolV1.execute((client) => action(client));
}

/**
 * Direct V1 client getter (acquires least-busy node).
 */
export async function getOpencodeClientV1(): Promise<OpencodeClientV1> {
  const node = await opencodePoolV1.getNode();
  return node.client;
}
