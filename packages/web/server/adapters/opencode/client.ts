// server/adapters/opencode/client.ts
//
// Lazily starts one opencode server+client for the process lifetime.
// createOpencode() spins up `opencode serve` under the hood — we only want
// to do that once, on first use, not on every request.

import { createOpencode } from '@opencode-ai/sdk';

let instance: ReturnType<typeof createOpencode> | null = null;

export function getOpencodeInstance() {
  if (!instance) {
    instance = createOpencode({
      hostname: '127.0.0.1',
      port: 4096,
      // hostname/port left as SDK defaults (127.0.0.1:4096) for MVP.
      // Pull from ~/.aero/harnesses.json per-harness config once that's
      // wired up (Phase 2 — storage schema solidification).
    });
  }

  return instance;
}

export async function getOpencodeClient() {
  const { client } = await getOpencodeInstance();
  return client;
}
