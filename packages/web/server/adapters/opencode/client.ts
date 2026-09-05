import type { createOpencodeClient as createOpencodeClientV2 } from '@opencode-ai/sdk/v2';

import { opencodePoolV2, type PoolNodeV2 } from './pool';

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
