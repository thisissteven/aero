// server/adapters/opencode/client.ts

import { createOpencode } from '@opencode-ai/sdk';

import { SessionListData } from '@/server/types/opencode';

type OpencodeClient = OpencodeInstance['client'];
type OpencodeInstance = Awaited<ReturnType<typeof createOpencode>>;

let instancePromise: Promise<OpencodeInstance> | null = null;

export async function getOpencodeInstance(): Promise<OpencodeInstance> {
  if (!instancePromise) {
    instancePromise = (async () => {
      const instance = await createOpencode({
        hostname: '127.0.0.1',
        port: 4096,
      });

      // Ping server to ensure port 4096 is bound before returning client
      await waitForServerReady(instance.client);

      return instance;
    })();
  }

  return instancePromise;
}

export async function getOpencodeClient() {
  const { client } = await getOpencodeInstance();
  return client;
}

async function waitForServerReady(
  client: OpencodeClient,
  maxRetries = 15,
  delayMs = 200,
) {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await client.session.list({ query: { limit: 1 } } as SessionListData);
      return;
    } catch {
      await new Promise((res) => setTimeout(res, delayMs));
    }
  }
  throw new Error('OpenCode server failed to respond on 127.0.0.1:4096');
}
