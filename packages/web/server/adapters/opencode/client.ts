import type { createOpencodeClient as createOpencodeClientV1 } from '@opencode-ai/sdk';
import type { createOpencodeClient as createOpencodeClientV2 } from '@opencode-ai/sdk/v2';

import {
  opencodePoolV1,
  opencodePoolV2,
  type PoolNodeV1,
  type PoolNodeV2,
} from './pool';

export type OpencodeClientV1 = ReturnType<typeof createOpencodeClientV1>;
export type OpencodeClientV2 = ReturnType<typeof createOpencodeClientV2>;
export type OpencodeClient = OpencodeClientV2;

export async function withOpencodeClientV2<T>(
  action: (client: OpencodeClientV2) => Promise<T>,
): Promise<T> {
  return opencodePoolV2.execute((client) => action(client));
}

/**
 * Acquires a client alongside a release handle to avoid active request counter leaks.
 */
export async function getOpencodeClientV2(): Promise<{
  client: OpencodeClientV2;
  node: PoolNodeV2;
  release: () => void;
}> {
  const node = await opencodePoolV2.getNode();
  return {
    client: node.client,
    node,
    release: () => opencodePoolV2.releaseNode(node),
  };
}

export const withOpencodeClient = withOpencodeClientV2;
export const getOpencodeClient = getOpencodeClientV2;

export async function withOpencodeClientV1<T>(
  action: (client: OpencodeClientV1) => Promise<T>,
): Promise<T> {
  return opencodePoolV1.execute((client) => action(client));
}

export async function getOpencodeClientV1(): Promise<{
  client: OpencodeClientV1;
  node: PoolNodeV1;
  release: () => void;
}> {
  const node = await opencodePoolV1.getNode();
  return {
    client: node.client,
    node,
    release: () => opencodePoolV1.releaseNode(node),
  };
}

export async function getOpencodeStreamingClientV2(): Promise<{
  client: OpencodeClientV2;
  node: PoolNodeV2;
}> {
  const node = await opencodePoolV2.getStreamingNode();

  return {
    client: node.client,
    node,
  };
}
