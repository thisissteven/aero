// server/adapters/codex/client.ts

import { Codex } from '@openai/codex-sdk';

let clientInstance: Codex | null = null;

export function getCodexClient(): Codex {
  if (!clientInstance) {
    clientInstance = new Codex();
  }

  return clientInstance;
}
