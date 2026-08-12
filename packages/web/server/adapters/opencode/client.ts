// server/adapters/opencode/client.ts

import {
  createOpencodeClient,
  createOpencodeServer,
} from '@opencode-ai/sdk/v2';

type OpencodeServer = Awaited<ReturnType<typeof createOpencodeServer>>;
type OpencodeClient = ReturnType<typeof createOpencodeClient>;

interface OpencodeSetup {
  server: OpencodeServer;
  client: OpencodeClient;
}

let setupPromise: Promise<OpencodeSetup> | null = null;

export async function getOpencodeSetup(): Promise<OpencodeSetup> {
  if (!setupPromise) {
    setupPromise = (async () => {
      const server = await createOpencodeServer({
        hostname: '127.0.0.1',
        port: 56789,
      });

      const client = createOpencodeClient({
        baseUrl: server.url,
      });

      await waitForServerReady(client);

      return { server, client };
    })();
  }

  return setupPromise;
}

export async function getOpencodeClient(): Promise<OpencodeClient> {
  const { client } = await getOpencodeSetup();
  return client;
}

export async function getOpencodeServer(): Promise<OpencodeServer> {
  const { server } = await getOpencodeSetup();
  return server;
}

async function waitForServerReady(
  client: OpencodeClient,
  maxRetries = 15,
  delayMs = 200,
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.session.list({ limit: 1 });
      return;
    } catch {
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  throw new Error('OpenCode server failed to respond on 127.0.0.1:56789');
}
