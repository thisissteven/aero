/* eslint-disable no-console */

import { execFileSync } from 'node:child_process';
import { createServer as createNetServer } from 'node:net';
import {
  createOpencodeClient as createClientV2,
  createOpencodeServer as createServerV2,
} from '@opencode-ai/sdk/v2';

import { installAeroPlugin } from '@/server/adapters/opencode/plugin';
import { unwrap } from '@/server/adapters/opencode/unwrap';
import { findAvailablePort } from '@/server/helper';

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

export type PoolNodeV2 = PoolNode<OpencodeClientV2, OpencodeServerV2>;

export interface PoolStats {
  poolSize: number;
  totalActiveRequests: number;
  healthyNodesCount: number;
  generation: number;
  nodes: Array<{
    id: number;
    port: number;
    activeRequests: number;
    isHealthy: boolean;
  }>;
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function _isPortOpen(port: number, host = '127.0.0.1'): Promise<boolean> {
  return new Promise((resolve) => {
    const server = createNetServer();
    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });
    server.listen(port, host);
  });
}

function _resolveOpenCodeExecutable(): string | undefined {
  try {
    const cmd = process.platform === 'win32' ? 'where.exe' : 'which';
    return (
      execFileSync(cmd, ['opencode'], {
        encoding: 'utf8',
        windowsHide: true,
        timeout: 5000,
      })
        .split(/\r?\n/)
        .map((line) => line.trim())
        .find(Boolean) ?? undefined
    );
  } catch {
    return undefined;
  }
}

export class OpencodeServerPool<
  TClient,
  TServer extends { url: string; close?: () => void },
> {
  private node: PoolNode<TClient, TServer> | null = null;
  private initPromise: Promise<void> | null = null;
  private shuttingDown = false;
  private activeToken = crypto.randomUUID();

  /**
   * Bumped every time `this.node` is replaced with a freshly booted
   * process — whether via a normal startup, `/restart`, or
   * `recoverNode`. Any session that existed on a prior generation's
   * process is gone and can never emit events again; consumers
   * (SessionEventHub) use this to detect that their upstream identity
   * changed and invalidate anything tied to the old process.
   */
  private generation = 0;

  constructor(
    private readonly createServerFn: (opts: {
      hostname: string;
      port: number;
    }) => Promise<TServer>,
    private readonly createClientFn: (opts: { baseUrl: string }) => TClient,
    private readonly healthCheckFn: (client: TClient) => Promise<unknown>,
    _poolSize = 1,
    private readonly basePort = 56789,
    private readonly versionLabel = 'V2',
  ) {}

  public init(): Promise<void> {
    if (
      this.shuttingDown ||
      (this.node?.isHealthy && !this.node.isRecovering)
    ) {
      return Promise.resolve();
    }
    if (this.initPromise) return this.initPromise;

    this.initPromise = (async () => {
      try {
        const port = await findAvailablePort(this.basePort);
        process.env.AERO_AGENT_TOOL_URL = `http://127.0.0.1:${port}/api/aero/agent-tool`;
        process.env.AERO_AGENT_TOOL_TOKEN = this.activeToken;

        const server = await this.createServerFn({
          hostname: '127.0.0.1',
          port,
        });
        const client = this.createClientFn({ baseUrl: server.url });

        for (let i = 0; i < 20; i++) {
          try {
            await this.healthCheckFn(client);
            this.node = {
              id: 0,
              port,
              server,
              client,
              activeRequests: 0,
              isHealthy: true,
              isRecovering: false,
            };
            // A brand new process is now backing this pool. Anything
            // that identified the "old" process (session ids, event
            // subscriptions) is stale as of this instant.
            this.generation++;
            return;
          } catch {
            await sleep(250);
          }
        }
        server.close?.();
      } catch (_err) {
        //
      }
    })().finally(() => {
      this.initPromise = null;
    });

    return this.initPromise;
  }

  public async getNode(): Promise<PoolNode<TClient, TServer>> {
    if (this.shuttingDown) {
      throw new Error(
        `[OpenCode Pool ${this.versionLabel}] Pool shutting down.`,
      );
    }

    if (!this.node || !this.node.isHealthy || this.node.isRecovering) {
      void this.init();
      await sleep(200);
    }

    if (this.node && this.node.isHealthy && !this.node.isRecovering) {
      this.node.activeRequests++;
      return this.node;
    }

    throw new Error(
      `[OpenCode Pool ${this.versionLabel}] No healthy server available.`,
    );
  }

  public async getStreamingNode(): Promise<PoolNode<TClient, TServer>> {
    return this.getNode();
  }

  public releaseNode(node: PoolNode<TClient, TServer>): void {
    node.activeRequests = Math.max(0, node.activeRequests - 1);
  }

  public async recoverNode(node: PoolNode<TClient, TServer>): Promise<void> {
    if (this.shuttingDown || node.isRecovering) return;
    node.isRecovering = true;
    node.isHealthy = false;
    try {
      node.server.close?.();
    } catch {
      // Ignore cleanup error
    }
    await this.init();
  }

  public async execute<T>(
    fn: (client: TClient, node: PoolNode<TClient, TServer>) => Promise<T>,
  ): Promise<T> {
    const node = await this.getNode();
    try {
      return await fn(node.client, node);
    } catch (error) {
      node.isHealthy = false;
      void this.recoverNode(node);
      throw error;
    } finally {
      this.releaseNode(node);
    }
  }

  public async authorize(token: string): Promise<boolean> {
    return token === this.activeToken;
  }

  /**
   * Monotonically increasing id for the currently running process.
   * Consumers that hold long-lived state tied to "the current
   * process" (e.g. an event-stream subscriber keyed by sessionId)
   * should snapshot this value on connect and compare it on every
   * reconnect to detect that the process — and therefore any session
   * that lived on it — is gone.
   */
  public getGeneration(): number {
    return this.generation;
  }

  public async getStats(): Promise<PoolStats> {
    const isHealthy = Boolean(this.node?.isHealthy && !this.node?.isRecovering);
    return {
      poolSize: this.node ? 1 : 0,
      totalActiveRequests: this.node?.activeRequests ?? 0,
      healthyNodesCount: isHealthy ? 1 : 0,
      generation: this.generation,
      nodes: this.node
        ? [
            {
              id: 0,
              port: this.node.port,
              activeRequests: this.node.activeRequests,
              isHealthy,
            },
          ]
        : [],
    };
  }

  public async getVersion(): Promise<{ version: string; port: number }> {
    return this.execute(async (client, node) => {
      const response = await (client as OpencodeClientV2).global.health();
      const health = unwrap(response);
      return { version: health.version, port: node.port };
    });
  }

  public async shutdown(): Promise<void> {
    this.shuttingDown = true;
    if (this.node) {
      try {
        this.node.server.close?.();
      } catch {
        // Ignore errors on shutdown
      }
      this.node = null;
    }
    this.shuttingDown = false;
  }
}

export const opencodePoolV2 = new OpencodeServerPool<
  OpencodeClientV2,
  OpencodeServerV2
>(
  async ({ hostname, port }) => {
    const noProxy = process.env.NO_PROXY
      ? `${process.env.NO_PROXY},127.0.0.1,localhost`
      : '127.0.0.1,localhost';

    process.env.OPENCODE_ENABLE_EXA = '1';
    process.env.NO_PROXY = noProxy;
    process.env.no_proxy = noProxy;
    process.env.OPENCODE_CONFIG_CONTENT = '';

    await installAeroPlugin();

    return createServerV2({
      hostname,
      port,
      config: {
        permission: {
          websearch: 'allow',
        },
        // plugin: [AERO_PLUGIN_PATH],
      },
    });
  },
  createClientV2,
  (client) => client.session.list({ limit: 1 }),
  1,
  56789,
  'V2',
);

export const opencodePool = opencodePoolV2;
