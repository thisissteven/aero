/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable no-console */

import {
  createOpencodeClient as createClientV1,
  createOpencodeServer as createServerV1,
} from '@opencode-ai/sdk';
import {
  createOpencodeClient as createClientV2,
  createOpencodeServer as createServerV2,
} from '@opencode-ai/sdk/v2';
import { execFileSync } from 'node:child_process';

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

const STARTUP_ATTEMPTS = 3;
const STARTUP_RETRY_DELAY = 1000;

const HEALTHCHECK_ATTEMPTS = 20;
const HEALTHCHECK_DELAY = 250;

const NODE_RETRY_ATTEMPTS = 3;
const NODE_RETRY_DELAY = 250;

const RECOVERY_DELAY = 1000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'string') {
    return error;
  }

  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function resolveOpenCodeExecutable(): string | undefined {
  try {
    if (process.platform === 'win32') {
      const output = execFileSync('where.exe', ['opencode'], {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 5000,
      });

      return (
        output
          .split(/\r?\n/)
          .map((line) => line.trim())
          .find(Boolean) ?? undefined
      );
    }

    return (
      execFileSync('which', ['opencode'], {
        encoding: 'utf8',
        timeout: 5000,
      }).trim() || undefined
    );
  } catch {
    return undefined;
  }
}

function getOpenCodeVersion(): string | undefined {
  try {
    const executable =
      process.platform === 'win32' ? 'opencode.cmd' : 'opencode';

    return (
      execFileSync(executable, ['--version'], {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 10000,
      }).trim() || undefined
    );
  } catch {
    return undefined;
  }
}

function isLikelyDaemonFailure(error: unknown): boolean {
  const message = getErrorMessage(error).toLowerCase();

  /*
   * These are generally provider/config/application failures.
   * Do not kill a perfectly healthy local OpenCode daemon for them.
   */
  if (
    message.includes('configinvaliderror') ||
    message.includes('invalid config') ||
    message.includes('config invalid') ||
    message.includes('validation error') ||
    message.includes('invalid argument') ||
    message.includes('unauthorized') ||
    message.includes('forbidden') ||
    message.includes('rate limit') ||
    message.includes('insufficient') ||
    message.includes('authentication') ||
    message.includes('api key') ||
    message.includes('cannot connect to api')
  ) {
    return false;
  }

  return (
    message.includes('econnrefused') ||
    message.includes('econnreset') ||
    message.includes('eaddrinuse') ||
    message.includes('socket hang up') ||
    message.includes('socket closed') ||
    message.includes('connection reset') ||
    message.includes('connection closed') ||
    message.includes('connection terminated') ||
    message.includes('broken pipe') ||
    message.includes('server exited') ||
    message.includes('process exited') ||
    message.includes('daemon unavailable') ||
    message.includes('server unavailable')
  );
}

export class OpencodeServerPool<
  TClient,
  TServer extends {
    url: string;
    close?: () => void;
  },
> {
  private nodes: PoolNode<TClient, TServer>[] = [];

  private initPromise: Promise<void> | null = null;
  private recoveryPromises = new Map<number, Promise<void>>();

  private shuttingDown = false;
  private lifecycle = 0;

  private readonly poolSize: number;
  private readonly basePort: number;
  private readonly versionLabel: string;

  constructor(
    private readonly createServerFn: (opts: {
      hostname: string;
      port: number;
    }) => Promise<TServer>,
    private readonly createClientFn: (opts: { baseUrl: string }) => TClient,
    private readonly healthCheckFn: (client: TClient) => Promise<unknown>,
    poolSize = 1,
    basePort = 56789,
    versionLabel = 'SDK',
  ) {
    this.poolSize = Math.max(1, Math.floor(poolSize));

    this.basePort = basePort;
    this.versionLabel = versionLabel;
  }

  /**
   * Starts initialization once.
   *
   * IMPORTANT:
   * This promise represents the background startup operation.
   * getNode() does NOT await it, so a broken OpenCode process can
   * never freeze an HTTP request while startup/recovery is happening.
   */
  public init(): Promise<void> {
    if (this.shuttingDown) {
      return Promise.resolve();
    }

    if (this.hasHealthyNode()) {
      return Promise.resolve();
    }

    if (this.initPromise) {
      return this.initPromise;
    }

    const lifecycle = this.lifecycle;

    this.initPromise = this.initializePool(lifecycle)
      .catch((error) => {
        /*
         * Never allow startup failures to become unhandled
         * rejections that can poison the rest of the application.
         */
        console.error(
          `[OpenCode Pool ${this.versionLabel}] ` +
            `Background initialization failed:`,
          error,
        );
      })
      .finally(() => {
        if (this.lifecycle === lifecycle) {
          this.initPromise = null;
        }
      });

    return this.initPromise;
  }

  private async initializePool(lifecycle: number): Promise<void> {
    if (
      this.shuttingDown ||
      lifecycle !== this.lifecycle ||
      this.hasHealthyNode()
    ) {
      return;
    }

    for (let attempt = 1; attempt <= STARTUP_ATTEMPTS; attempt++) {
      if (
        this.shuttingDown ||
        lifecycle !== this.lifecycle ||
        this.hasHealthyNode()
      ) {
        return;
      }

      console.log(
        `[OpenCode Pool ${this.versionLabel}] ` +
          `Initializing ${this.poolSize} node(s) ` +
          `(attempt ${attempt}/${STARTUP_ATTEMPTS})...`,
      );

      const spawns: Promise<PoolNode<TClient, TServer>>[] = [];

      /*
       * Every startup attempt gets fresh ports.
       * Never assume a timed-out SDK startup immediately released
       * the previous port/process.
       */
      let nextPort = this.basePort;

      for (let id = 0; id < this.poolSize; id++) {
        let port: number;

        try {
          port = await findAvailablePort(nextPort);
        } catch (error) {
          console.error(
            `[OpenCode Pool ${this.versionLabel}] ` +
              `Failed to find port for node ${id}:`,
            error,
          );

          nextPort += 1;
          continue;
        }

        spawns.push(this.spawnNode(id, port, lifecycle));

        nextPort = port + 1;
      }

      const results = await Promise.allSettled(spawns);

      if (this.shuttingDown || lifecycle !== this.lifecycle) {
        await this.closeSuccessfulNodes(results);
        return;
      }

      const successfulNodes: PoolNode<TClient, TServer>[] = [];

      for (const [index, result] of results.entries()) {
        if (result.status === 'fulfilled') {
          successfulNodes.push(result.value);
        } else {
          console.error(
            `[OpenCode Pool ${this.versionLabel}] ` +
              `Node ${index} failed to start:`,
            result.reason,
          );
        }
      }

      for (const freshNode of successfulNodes) {
        this.installNode(freshNode);
      }

      if (this.hasHealthyNode()) {
        console.log(
          `[OpenCode Pool ${this.versionLabel}] ` +
            `Active nodes: ${this.healthyNodeCount()}/${this.poolSize} ` +
            `on ports: [${this.nodes
              .filter((node) => node.isHealthy && !node.isRecovering)
              .map((node) => node.port)
              .join(', ')}]`,
        );

        return;
      }

      if (attempt < STARTUP_ATTEMPTS) {
        console.warn(
          `[OpenCode Pool ${this.versionLabel}] ` +
            `No healthy nodes after startup attempt ${attempt}; ` +
            `retrying...`,
        );

        await sleep(STARTUP_RETRY_DELAY * attempt);
      }
    }

    /*
     * Deliberately don't throw.
     *
     * The pool is allowed to be empty. The application itself
     * remains alive and future getNode() calls can trigger another
     * initialization cycle.
     */
    console.error(
      `[OpenCode Pool ${this.versionLabel}] ` +
        `Unable to initialize any healthy OpenCode nodes. ` +
        `Will retry lazily.`,
    );
  }

  private async spawnNode(
    id: number,
    port: number,
    lifecycle: number,
  ): Promise<PoolNode<TClient, TServer>> {
    if (this.shuttingDown || lifecycle !== this.lifecycle) {
      throw new Error(
        `[OpenCode Pool ${this.versionLabel}] ` + `Node startup cancelled.`,
      );
    }

    console.log(`[OpenCode Pool ${this.versionLabel}] Spawning node`, {
      id,
      port,
      executable: resolveOpenCodeExecutable(),
      version: getOpenCodeVersion(),
      HTTP_PROXY: process.env.HTTP_PROXY,
      HTTPS_PROXY: process.env.HTTPS_PROXY,
      ALL_PROXY: process.env.ALL_PROXY,
      NO_PROXY: process.env.NO_PROXY,
      NODE_ENV: process.env.NODE_ENV,
    });

    let server: TServer;

    try {
      server = await this.createServerFn({
        hostname: '127.0.0.1',
        port,
      });
    } catch (error) {
      console.error(
        `[OpenCode Pool ${this.versionLabel}] ` +
          `createOpencodeServer failed ` +
          `(node ${id}, port ${port}):`,
        error,
      );

      throw error;
    }

    /*
     * If shutdown/restart happened while the SDK was
     * creating the server, immediately close the newly
     * created instance rather than leaving an orphan behind.
     */
    if (this.shuttingDown || lifecycle !== this.lifecycle) {
      try {
        server.close?.();
      } catch {
        // Ignore cleanup errors.
      }

      throw new Error(
        `[OpenCode Pool ${this.versionLabel}] ` +
          `Node startup cancelled after server creation.`,
      );
    }

    const client = this.createClientFn({
      baseUrl: server.url,
    });

    try {
      await this.waitForServerReady(client, port, lifecycle);
    } catch (error) {
      try {
        server.close?.();
      } catch {
        // Ignore cleanup errors.
      }

      throw error;
    }

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
    lifecycle: number,
    maxRetries = HEALTHCHECK_ATTEMPTS,
    delayMs = HEALTHCHECK_DELAY,
  ): Promise<void> {
    let lastError: unknown = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      if (this.shuttingDown || lifecycle !== this.lifecycle) {
        throw new Error(
          `[OpenCode Pool ${this.versionLabel}] ` +
            `Health check cancelled for port ${port}.`,
        );
      }

      try {
        await this.healthCheckFn(client);

        return;
      } catch (error) {
        lastError = error;

        if (attempt < maxRetries) {
          await sleep(delayMs);
        }
      }
    }

    throw new Error(
      `[OpenCode Pool ${this.versionLabel}] ` +
        `Server failed health check on port ${port} ` +
        `after ${maxRetries} attempts. ` +
        `${getErrorMessage(lastError)}`,
    );
  }

  private installNode(freshNode: PoolNode<TClient, TServer>): void {
    const existingIndex = this.nodes.findIndex(
      (node) => node.id === freshNode.id,
    );

    if (existingIndex === -1) {
      this.nodes.push(freshNode);
      this.nodes.sort((a, b) => a.id - b.id);
      return;
    }

    const existing = this.nodes[existingIndex];

    try {
      existing.server.close?.();
    } catch {
      // Ignore cleanup errors.
    }

    this.nodes[existingIndex] = freshNode;
  }

  private async closeSuccessfulNodes(
    results: PromiseSettledResult<PoolNode<TClient, TServer>>[],
  ): Promise<void> {
    const successful = results.filter(
      (result): result is PromiseFulfilledResult<PoolNode<TClient, TServer>> =>
        result.status === 'fulfilled',
    );

    await Promise.allSettled(
      successful.map(async (result) => {
        try {
          result.value.server.close?.();
        } catch {
          // Ignore cleanup errors.
        }
      }),
    );
  }

  private selectHealthyNode(): PoolNode<TClient, TServer> | undefined {
    return this.nodes
      .filter((node) => node.isHealthy && !node.isRecovering)
      .sort((a, b) => a.activeRequests - b.activeRequests)[0];
  }

  private hasHealthyNode(): boolean {
    return !!this.selectHealthyNode();
  }

  private healthyNodeCount(): number {
    return this.nodes.filter((node) => node.isHealthy && !node.isRecovering)
      .length;
  }

  /**
   * IMPORTANT:
   *
   * Do not await initialization here.
   *
   * If OpenCode takes 5s, 10s, or fails completely, the caller gets
   * a fast failure instead of freezing an HTTP request.
   */
  public async getNode(
    retries = NODE_RETRY_ATTEMPTS,
  ): Promise<PoolNode<TClient, TServer>> {
    const attempts = Math.max(1, retries);

    for (let attempt = 1; attempt <= attempts; attempt++) {
      if (this.shuttingDown) {
        throw new Error(
          `[OpenCode Pool ${this.versionLabel}] Pool is shutting down.`,
        );
      }

      const existing = this.selectHealthyNode();

      if (existing) {
        existing.activeRequests++;
        return existing;
      }

      /*
       * Kick startup/recovery into the background.
       * NEVER await it here.
       */
      void this.init().catch((error) => {
        console.error(
          `[OpenCode Pool ${this.versionLabel}] ` + `Background init error:`,
          error,
        );
      });

      /*
       * Give an already-in-flight startup a very small window
       * to become ready. This is deliberately short so requests
       * cannot hang behind OpenCode startup.
       */
      const node = await this.waitForHealthyNode(
        Math.min(250, NODE_RETRY_DELAY),
      );

      if (node) {
        node.activeRequests++;
        return node;
      }

      if (attempt < attempts) {
        await sleep(NODE_RETRY_DELAY);
      }
    }

    throw new Error(
      `[OpenCode Pool ${this.versionLabel}] ` +
        `No healthy OpenCode server is currently available.`,
    );
  }

  private async waitForHealthyNode(
    timeoutMs: number,
  ): Promise<PoolNode<TClient, TServer> | undefined> {
    const started = Date.now();

    while (Date.now() - started < timeoutMs) {
      const node = this.selectHealthyNode();

      if (node) {
        return node;
      }

      if (this.shuttingDown) {
        return undefined;
      }

      await sleep(25);
    }

    return this.selectHealthyNode();
  }

  public async getStreamingNode(): Promise<PoolNode<TClient, TServer>> {
    return this.getNode();
  }

  public releaseNode(node: PoolNode<TClient, TServer>): void {
    node.activeRequests = Math.max(0, node.activeRequests - 1);
  }

  private async recoverUnhealthyNodes(): Promise<void> {
    if (this.shuttingDown) {
      return;
    }

    /*
     * If the pool has no nodes at all, initialization handles
     * creating them.
     */
    if (this.nodes.length === 0) {
      void this.init().catch((error) => {
        console.error(
          `[OpenCode Pool ${this.versionLabel}] ` +
            `Background initialization error:`,
          error,
        );
      });

      return;
    }

    const deadNodes = this.nodes.filter(
      (node) => !node.isHealthy && !node.isRecovering,
    );

    for (const node of deadNodes) {
      void this.recoverNode(node);
    }
  }

  public async recoverNode(node: PoolNode<TClient, TServer>): Promise<void> {
    if (this.shuttingDown || node.isRecovering) {
      return;
    }

    const existingRecovery = this.recoveryPromises.get(node.id);

    if (existingRecovery) {
      return existingRecovery;
    }

    node.isRecovering = true;
    node.isHealthy = false;

    const lifecycle = this.lifecycle;

    const recovery = (async () => {
      console.warn(
        `[OpenCode Pool ${this.versionLabel}] ` +
          `Recovering node ${node.id} ` +
          `(old port ${node.port})...`,
      );

      try {
        /*
         * Close the old server before allocating a replacement.
         */
        try {
          node.server.close?.();
        } catch {
          // Ignore cleanup failures.
        }

        /*
         * Let the old OpenCode process/socket settle.
         */
        await sleep(RECOVERY_DELAY);

        if (this.shuttingDown || lifecycle !== this.lifecycle) {
          return;
        }

        /*
         * Fresh port every time.
         */
        const freshPort = await findAvailablePort(this.basePort);

        const freshNode = await this.spawnNode(node.id, freshPort, lifecycle);

        if (this.shuttingDown || lifecycle !== this.lifecycle) {
          try {
            freshNode.server.close?.();
          } catch {
            // Ignore.
          }

          return;
        }

        /*
         * Preserve the original PoolNode object so any code
         * holding a reference to it doesn't suddenly point at
         * a stale object.
         */
        Object.assign(node, freshNode, {
          isRecovering: false,
          isHealthy: true,
        });

        console.log(
          `[OpenCode Pool ${this.versionLabel}] ` +
            `Node ${node.id} recovered on port ${freshPort}.`,
        );
      } catch (error) {
        node.isHealthy = false;

        console.error(
          `[OpenCode Pool ${this.versionLabel}] ` +
            `Recovery failed for node ${node.id}:`,
          error,
        );
      } finally {
        node.isRecovering = false;
      }
    })();

    this.recoveryPromises.set(node.id, recovery);

    try {
      await recovery;
    } finally {
      if (this.recoveryPromises.get(node.id) === recovery) {
        this.recoveryPromises.delete(node.id);
      }
    }
  }

  public async execute<T>(
    fn: (client: TClient, node: PoolNode<TClient, TServer>) => Promise<T>,
  ): Promise<T> {
    const node = await this.getNode();

    try {
      return await fn(node.client, node);
    } catch (error) {
      console.error(
        `[OpenCode Pool ${this.versionLabel}] ` +
          `Request failed on node ${node.id} ` +
          `(port ${node.port}):`,
        error,
      );

      /*
       * Only recover the local daemon for local-daemon failures.
       *
       * Provider errors such as "Cannot connect to API" are left
       * alone because they do not imply the local OpenCode daemon
       * is dead.
       */
      if (isLikelyDaemonFailure(error)) {
        node.isHealthy = false;

        void this.recoverNode(node).catch((recoveryError) => {
          console.error(
            `[OpenCode Pool ${this.versionLabel}] ` +
              `Unhandled recovery error:`,
            recoveryError,
          );
        });
      }

      throw error;
    } finally {
      this.releaseNode(node);
    }
  }

  /**
   * Stats are always safe.
   *
   * This endpoint NEVER initializes or waits for OpenCode.
   */
  public async getStats(): Promise<PoolStats> {
    const nodes = this.nodes.map((node) => ({
      id: node.id,
      port: node.port,
      activeRequests: node.activeRequests,
      isHealthy: node.isHealthy && !node.isRecovering,
    }));

    const totalActiveRequests = nodes.reduce(
      (sum, node) => sum + node.activeRequests,
      0,
    );

    const healthyNodesCount = nodes.filter((node) => node.isHealthy).length;

    return {
      poolSize: nodes.length,
      totalActiveRequests,
      healthyNodesCount,
      nodes,
    };
  }

  /**
   * Public API unchanged.
   */
  public async getVersion(): Promise<{
    version: string;
    port: number;
  }> {
    return this.execute(async (client, node) => {
      const response = await (client as OpencodeClientV2).global.health();

      const health = unwrap(response);

      return {
        version: health.version,
        port: node.port,
      };
    });
  }

  /**
   * Forcefully tears down every node and invalidates all
   * in-flight startup/recovery work.
   */
  public async shutdown(): Promise<void> {
    this.shuttingDown = true;
    this.lifecycle++;

    const nodes = this.nodes;

    this.nodes = [];

    this.initPromise = null;
    this.recoveryPromises.clear();

    await Promise.allSettled(
      nodes.map(async (node) => {
        node.isHealthy = false;
        node.isRecovering = false;
        node.activeRequests = 0;

        try {
          node.server.close?.();
        } catch (error) {
          console.warn(
            `[OpenCode Pool ${this.versionLabel}] ` +
              `Failed to close node ${node.id}:`,
            error,
          );
        }
      }),
    );

    this.shuttingDown = false;
  }
}

const POOL_SIZE = Number(process.env.OPENCODE_POOL_SIZE) || 1;

export const opencodePoolV1 = new OpencodeServerPool<
  OpencodeClientV1,
  OpencodeServerV1
>(
  createServerV1,
  createClientV1,
  (client) =>
    client.session.list({
      query: {
        limit: 1,
      },
    } as any),
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
  (client) =>
    client.session.list({
      limit: 1,
    }),
  POOL_SIZE,
  56789,
  'V2',
);

export const opencodePool = opencodePoolV2;
