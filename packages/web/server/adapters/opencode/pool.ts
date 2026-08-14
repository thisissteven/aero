/* eslint-disable no-console */
// server/adapters/opencode/pool.ts

import {
  createOpencodeClient as createClientV1,
  createOpencodeServer as createServerV1,
} from '@opencode-ai/sdk';
import {
  createOpencodeClient as createClientV2,
  createOpencodeServer as createServerV2,
} from '@opencode-ai/sdk/v2';

import { findAvailablePort } from '@/server/helper';

// Types for SDK V1
export type OpencodeServerV1 = Awaited<ReturnType<typeof createServerV1>>;
export type OpencodeClientV1 = ReturnType<typeof createClientV1>;

// Types for SDK V2
export type OpencodeServerV2 = Awaited<ReturnType<typeof createServerV2>>;
export type OpencodeClientV2 = ReturnType<typeof createClientV2>;

export interface PoolNode<TClient, TServer> {
  id: number;
  port: number;
  server: TServer;
  client: TClient;
  activeRequests: number;
  isHealthy: boolean;
}

// Convenience node types
export type PoolNodeV1 = PoolNode<OpencodeClientV1, OpencodeServerV1>;
export type PoolNodeV2 = PoolNode<OpencodeClientV2, OpencodeServerV2>;

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

/**
 * Generic server pool managing process spawning, port resolution, health checks, and recovery.
 */
export class OpencodeServerPool<
  TClient,
  TServer extends { url: string; close?: () => void },
> {
  private nodes: PoolNode<TClient, TServer>[] = [];
  private poolSize: number;
  private basePort: number;
  private versionLabel: string;
  private initPromise: Promise<void> | null = null;

  constructor(
    private createServerFn: (opts: {
      hostname: string;
      port: number;
    }) => Promise<TServer>,
    private createClientFn: (opts: { baseUrl: string }) => TClient,
    private healthCheckFn: (client: TClient) => Promise<unknown>,
    poolSize = 3,
    basePort = 56789,
    versionLabel = 'SDK',
  ) {
    this.poolSize = poolSize;
    this.basePort = basePort;
    this.versionLabel = versionLabel;
  }

  /**
   * Initializes all server nodes in the pool.
   */
  public async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const spawns: Promise<PoolNode<TClient, TServer>>[] = [];
      let currentPort = this.basePort;

      // Dynamically resolve distinct free ports for each node sequentially
      for (let i = 0; i < this.poolSize; i++) {
        const port = await findAvailablePort(currentPort);
        spawns.push(this.spawnNode(i, port));
        currentPort = port + 1;
      }

      const results = await Promise.allSettled(spawns);
      this.nodes = results
        .filter(
          (r): r is PromiseFulfilledResult<PoolNode<TClient, TServer>> =>
            r.status === 'fulfilled',
        )
        .map((r) => r.value);

      if (this.nodes.length === 0) {
        results.forEach((r, idx) => {
          if (r.status === 'rejected') {
            console.error(
              `[OpenCode Pool ${this.versionLabel}] Node ${idx} spawn failed:`,
              r.reason,
            );
          }
        });
        throw new Error(
          `Failed to initialize any OpenCode ${this.versionLabel} server instances.`,
        );
      }

      console.log(
        `[OpenCode Pool ${this.versionLabel}] Active nodes: ${this.nodes.length}/${this.poolSize} on ports: [${this.nodes.map((n) => n.port).join(', ')}]`,
      );
    })().catch((err) => {
      this.initPromise = null;
      throw err;
    });

    return this.initPromise;
  }

  private async spawnNode(
    id: number,
    port: number,
  ): Promise<PoolNode<TClient, TServer>> {
    const server = await this.createServerFn({
      hostname: '127.0.0.1',
      port,
    });

    const client = this.createClientFn({
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
    client: TClient,
    port: number,
    maxRetries = 15,
    delayMs = 200,
  ): Promise<void> {
    for (let i = 0; i < maxRetries; i++) {
      try {
        await this.healthCheckFn(client);
        return;
      } catch {
        await new Promise((res) => setTimeout(res, delayMs));
      }
    }
    throw new Error(
      `[OpenCode Pool ${this.versionLabel}] Server failed to respond on port ${port}`,
    );
  }

  /**
   * Recovers a failed node by resolving a new free port.
   */
  private async recoverNode(node: PoolNode<TClient, TServer>): Promise<void> {
    console.warn(
      `[OpenCode Pool ${this.versionLabel}] Attempting recovery for node ${node.id} (port ${node.port})...`,
    );
    try {
      node.server.close?.();
    } catch {
      // ignore error on closing dead server
    }

    try {
      const freshPort = await findAvailablePort(node.port);
      const freshNode = await this.spawnNode(node.id, freshPort);
      Object.assign(node, freshNode);
      console.log(
        `[OpenCode Pool ${this.versionLabel}] Node ${node.id} recovered on port ${freshPort}.`,
      );
    } catch (err) {
      console.error(
        `[OpenCode Pool ${this.versionLabel}] Recovery failed for node ${node.id}:`,
        err,
      );
    }
  }

  /**
   * Acquires the least-busy healthy node from the pool.
   */
  public async getNode(): Promise<PoolNode<TClient, TServer>> {
    await this.init();

    const healthyNodes = this.nodes.filter((n) => n.isHealthy);
    if (healthyNodes.length === 0) {
      throw new Error(
        `[OpenCode Pool ${this.versionLabel}] No healthy server nodes available.`,
      );
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
    fn: (client: TClient, node: PoolNode<TClient, TServer>) => Promise<T>,
  ): Promise<T> {
    const node = await this.getNode();
    try {
      return await fn(node.client, node);
    } catch (err) {
      console.error(
        `[OpenCode Pool ${this.versionLabel}] Error on port ${node.port}:`,
        err,
      );
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
    console.log(
      `[OpenCode Pool ${this.versionLabel}] Shutting down all server instances...`,
    );
    await Promise.allSettled(
      this.nodes.map(async (n) => {
        try {
          n.server.close?.();
          console.log(
            `[OpenCode Pool ${this.versionLabel}] Closed daemon on port ${n.port}`,
          );
        } catch (err) {
          console.error(
            `[OpenCode Pool ${this.versionLabel}] Error closing server on port ${n.port}:`,
            err,
          );
        }
      }),
    );
    this.nodes = [];
  }
}

// Singleton Pool Instances
const POOL_SIZE = Number(process.env.OPENCODE_POOL_SIZE) || 1;

/** Pool Instance for SDK V1 */
export const opencodePoolV1 = new OpencodeServerPool<
  OpencodeClientV1,
  OpencodeServerV1
>(
  createServerV1,
  createClientV1,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client) => client.session.list({ query: { limit: 1 } } as any),
  POOL_SIZE,
  50789, // Offset port range to avoid collision with V2
  'V1',
);

/** Pool Instance for SDK V2 */
export const opencodePoolV2 = new OpencodeServerPool<
  OpencodeClientV2,
  OpencodeServerV2
>(
  createServerV2,
  createClientV2,
  (client) => client.session.list({ limit: 1 }),
  POOL_SIZE,
  56789,
  'V2',
);

/** Default Alias for Backward Compatibility */
export const opencodePool = opencodePoolV2;

// --- Automatic Process Cleanup ---
// Ensures spawned daemons for both pools exit when Node process stops
const cleanup = async () => {
  await Promise.allSettled([
    opencodePoolV1.shutdown(),
    opencodePoolV2.shutdown(),
  ]);
  process.exit(0);
};

process.once('SIGINT', cleanup);
process.once('SIGTERM', cleanup);
