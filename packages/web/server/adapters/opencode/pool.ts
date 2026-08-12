/* eslint-disable no-console */
// server/adapters/opencode/pool.ts

import {
  createOpencodeClient,
  createOpencodeServer,
} from '@opencode-ai/sdk/v2';

import { findAvailablePort } from '@/server/helper';

type OpencodeServer = Awaited<ReturnType<typeof createOpencodeServer>>;
type OpencodeClient = ReturnType<typeof createOpencodeClient>;

export interface PoolNode {
  id: number;
  port: number;
  server: OpencodeServer;
  client: OpencodeClient;
  activeRequests: number;
  isHealthy: boolean;
}

export interface PoolStats {
  poolSize: number;
  totalActiveRequests: number;
  healthyNodesCount: number;
  nodes: Array<{
    id: number;
    port: number;
    activeRequests: number;
    isHealthy: boolean;
  }>;
}

export class OpencodeServerPool {
  private nodes: PoolNode[] = [];
  private poolSize: number;
  private basePort: number;
  private rrIndex = 0;
  private initPromise: Promise<void> | null = null;

  constructor(poolSize = 3, basePort = 56789) {
    this.poolSize = poolSize;
    this.basePort = basePort;
  }

  /**
   * Initializes all server nodes in the pool.
   */
  public async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const spawns: Promise<PoolNode>[] = [];
      let currentPort = this.basePort;

      // Dynamically resolve distinct free ports for each node sequentially
      for (let i = 0; i < this.poolSize; i++) {
        const port = await findAvailablePort(currentPort);
        spawns.push(this.spawnNode(i, port));
        // Increment search start for the next node to avoid collisions
        currentPort = port + 1;
      }

      const results = await Promise.allSettled(spawns);
      this.nodes = results
        .filter(
          (r): r is PromiseFulfilledResult<PoolNode> =>
            r.status === 'fulfilled',
        )
        .map((r) => r.value);

      if (this.nodes.length === 0) {
        results.forEach((r, idx) => {
          if (r.status === 'rejected') {
            console.error(
              `[OpenCode Pool] Node ${idx} spawn failed:`,
              r.reason,
            );
          }
        });
        throw new Error('Failed to initialize any OpenCode server instances.');
      }

      console.log(
        `[OpenCode Pool] Active nodes: ${this.nodes.length}/${this.poolSize} on ports: [${this.nodes.map((n) => n.port).join(', ')}]`,
      );
    })().catch((err) => {
      // Reset promise cache on failure to allow future initialization retries
      this.initPromise = null;
      throw err;
    });

    return this.initPromise;
  }

  private async spawnNode(id: number, port: number): Promise<PoolNode> {
    const server = await createOpencodeServer({
      hostname: '127.0.0.1',
      port,
    });

    const client = createOpencodeClient({
      baseUrl: server.url,
    });

    await this.waitForServerReady(client, port);

    return {
      id,
      port,
      server,
      client,
      activeRequests: 0,
      isHealthy: true,
    };
  }

  private async waitForServerReady(
    client: OpencodeClient,
    port: number,
    maxRetries = 15,
    delayMs = 200,
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await client.session.list({ limit: 1 });
        return;
      } catch {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
    throw new Error(`OpenCode server failed to respond on port ${port}`);
  }

  /**
   * Recovers a failed node by resolving a new free port.
   */
  private async recoverNode(node: PoolNode): Promise<void> {
    console.warn(
      `[OpenCode Pool] Attempting recovery for node ${node.id} (port ${node.port})...`,
    );
    try {
      node.server.close?.();
    } catch {
      //
    }

    try {
      // Find a fresh free port starting from the node's old port
      const freshPort = await findAvailablePort(node.port);
      const freshNode = await this.spawnNode(node.id, freshPort);
      Object.assign(node, freshNode);
      console.log(
        `[OpenCode Pool] Node ${node.id} recovered on port ${freshPort}.`,
      );
    } catch (err) {
      console.error(
        `[OpenCode Pool] Recovery failed for node ${node.id}:`,
        err,
      );
    }
  }

  /**
   * Acquires the least-busy healthy node from the pool.
   */
  public async getNode(): Promise<PoolNode> {
    await this.init();

    const healthyNodes = this.nodes.filter((n) => n.isHealthy);
    if (healthyNodes.length === 0) {
      throw new Error('[OpenCode Pool] No healthy server nodes available.');
    }

    healthyNodes.sort((a, b) => a.activeRequests - b.activeRequests);
    const selected = healthyNodes[0];

    selected.activeRequests++;
    return selected;
  }

  /**
   * Executes a task on an available node with automatic cleanup and fallback.
   */
  public async execute<T>(
    fn: (client: OpencodeClient, node: PoolNode) => Promise<T>,
  ): Promise<T> {
    const node = await this.getNode();
    try {
      return await fn(node.client, node);
    } catch (err) {
      console.error(`[OpenCode Pool] Error on port ${node.port}:`, err);
      node.isHealthy = false;
      this.recoverNode(node);
      throw err;
    } finally {
      node.activeRequests = Math.max(0, node.activeRequests - 1);
    }
  }

  /**
   * Returns a snapshot of current pool health, active requests, and node states.
   */
  public async getStats(): Promise<PoolStats> {
    await this.init();

    const nodes = this.nodes.map((n) => ({
      id: n.id,
      port: n.port,
      activeRequests: n.activeRequests,
      isHealthy: n.isHealthy,
    }));

    const totalActiveRequests = nodes.reduce(
      (sum, n) => sum + n.activeRequests,
      0,
    );
    const healthyNodesCount = nodes.filter((n) => n.isHealthy).length;

    return {
      poolSize: this.nodes.length,
      totalActiveRequests,
      healthyNodesCount,
      nodes,
    };
  }

  /**
   * Gracefully closes all server instances in the pool.
   */
  public async shutdown(): Promise<void> {
    console.log('[OpenCode Pool] Shutting down all server instances...');
    await Promise.allSettled(
      this.nodes.map(async (n) => {
        try {
          n.server.close?.();
          console.log(`[OpenCode Pool] Closed daemon on port ${n.port}`);
        } catch (err) {
          console.error(
            `[OpenCode Pool] Error closing server on port ${n.port}:`,
            err,
          );
        }
      }),
    );
    this.nodes = [];
  }
}

// Singleton Pool Instance
const POOL_SIZE = Number(process.env.OPENCODE_POOL_SIZE) || 3;
export const opencodePool = new OpencodeServerPool(POOL_SIZE, 56789);

// --- Automatic Process Cleanup ---
// Ensures spawned daemons exit when Node process stops
const cleanup = async () => {
  await opencodePool.shutdown();
  process.exit(0);
};

process.once('SIGINT', cleanup);
process.once('SIGTERM', cleanup);
