/* eslint-disable no-console */
import {
  createOpencodeClient as createClientV1,
  createOpencodeServer as createServerV1,
} from '@opencode-ai/sdk';
import {
  createOpencodeClient as createClientV2,
  createOpencodeServer as createServerV2,
} from '@opencode-ai/sdk/v2';

import { unwrap } from '@/server/adapters/opencode/unwrap';
import { findAvailablePort } from '@/server/helper';

export type OpencodeServerV1 = Awaited<ReturnType<typeof createServerV1>>;
export type OpencodeClientV1 = ReturnType<typeof createClientV1>;
export type OpencodeServerV2 = Awaited<ReturnType<typeof createServerV2>>;
export type OpencodeClientV2 = ReturnType<typeof createClientV2>;

export interface PoolNode<TClient, TServer> {
  id: number;
  port: number;
  server: TServer;
  client: TClient;
  activeRequests: number;
  isHealthy: boolean;
  isRecovering: boolean;
}

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
    poolSize = 1,
    basePort = 56789,
    versionLabel = 'SDK',
  ) {
    this.poolSize = poolSize;
    this.basePort = basePort;
    this.versionLabel = versionLabel;
  }

  public async init(): Promise<void> {
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      const spawns: Promise<PoolNode<TClient, TServer>>[] = [];
      let currentPort = this.basePort;

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
    const server = await this.createServerFn({ hostname: '127.0.0.1', port });
    const client = this.createClientFn({ baseUrl: server.url });

    await this.waitForServerReady(client, port);

    return {
      id,
      port,
      server,
      client,
      activeRequests: 0,
      isHealthy: true,
      isRecovering: false,
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

  public async recoverNode(node: PoolNode<TClient, TServer>): Promise<void> {
    if (node.isRecovering) return;
    node.isRecovering = true;
    node.isHealthy = false;

    console.warn(
      `[OpenCode Pool ${this.versionLabel}] Attempting recovery for node ${node.id} (port ${node.port})...`,
    );

    try {
      node.server.close?.();
    } catch {
      // ignore close errors on dead instances
    }

    try {
      const freshPort = await findAvailablePort(node.port);
      const freshNode = await this.spawnNode(node.id, freshPort);
      Object.assign(node, freshNode, { isRecovering: false, isHealthy: true });
      console.log(
        `[OpenCode Pool ${this.versionLabel}] Node ${node.id} recovered on port ${freshPort}.`,
      );
    } catch (err) {
      node.isRecovering = false;
      console.error(
        `[OpenCode Pool ${this.versionLabel}] Recovery failed for node ${node.id}:`,
        err,
      );
    }
  }

  public async getNode(retries = 3): Promise<PoolNode<TClient, TServer>> {
    await this.init();

    for (let attempt = 0; attempt < retries; attempt++) {
      const healthyNodes = this.nodes.filter((n) => n.isHealthy);

      if (healthyNodes.length > 0) {
        healthyNodes.sort((a, b) => a.activeRequests - b.activeRequests);
        const selected = healthyNodes[0];
        selected.activeRequests++;
        return selected;
      }

      // Trigger recovery for any dead nodes that aren't recovering yet
      const deadNodes = this.nodes.filter(
        (n) => !n.isHealthy && !n.isRecovering,
      );
      deadNodes.forEach((n) => this.recoverNode(n));

      // Wait 500ms before retrying node selection
      await new Promise((res) => setTimeout(res, 500));
    }

    throw new Error(
      `[OpenCode Pool ${this.versionLabel}] No healthy server nodes available.`,
    );
  }

  public releaseNode(node: PoolNode<TClient, TServer>): void {
    node.activeRequests = Math.max(0, node.activeRequests - 1);
  }

  public async execute<T>(
    fn: (client: TClient, node: PoolNode<TClient, TServer>) => Promise<T>,
  ): Promise<T> {
    const node = await this.getNode();
    try {
      return await fn(node.client, node);
    } catch (err) {
      // Verify if error was caused by actual daemon crash vs API application error
      let isDaemonAlive = false;
      try {
        await this.healthCheckFn(node.client);
        isDaemonAlive = true;
      } catch {
        isDaemonAlive = false;
      }

      if (!isDaemonAlive) {
        console.error(
          `[OpenCode Pool ${this.versionLabel}] Daemon crashed on port ${node.port}:`,
          err,
        );
        this.recoverNode(node);
      }

      throw err;
    } finally {
      this.releaseNode(node);
    }
  }

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

  public async getVersion(): Promise<{ version: string; port: number }> {
    return this.execute(async (client, node) => {
      const health = unwrap(await (client as OpencodeClientV2).global.health());
      return {
        version: health.version,
        port: node.port,
      };
    });
  }

  public async shutdown(): Promise<void> {
    await Promise.allSettled(
      this.nodes.map(async (n) => {
        try {
          n.server.close?.();
        } catch {
          // ignore
        }
      }),
    );
    this.nodes = [];
    this.initPromise = null;
  }
}

const POOL_SIZE = Number(process.env.OPENCODE_POOL_SIZE) || 1;

export const opencodePoolV1 = new OpencodeServerPool<
  OpencodeClientV1,
  OpencodeServerV1
>(
  createServerV1,
  createClientV1,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (client) => client.session.list({ query: { limit: 1 } } as any),
  POOL_SIZE,
  50789,
  'V1',
);

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

export const opencodePool = opencodePoolV2;
