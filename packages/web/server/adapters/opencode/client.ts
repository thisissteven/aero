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
      // 1. Start the server process independently
      const server = await createOpencodeServer({
        hostname: '127.0.0.1',
        port: 56789,
      });

      // 2. Instantiate client bound to server URL
      const client = createOpencodeClient({
        baseUrl: server.url,
      });

      // 3. Ping server to ensure port 4096 is bound before returning
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
  throw new Error('OpenCode server failed to respond on 127.0.0.1:4096');
}
