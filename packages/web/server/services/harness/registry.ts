// server/services/harness/registry.ts
//
// The only place that knows adapters exist. Routes call getActiveAdapter()
// and never see harness-specific code. Adding codex/claude later means:
//   1. write server/adapters/codex implementing HarnessAdapter
//   2. add a case to buildAdapter() below
// No route or frontend change required if the interface holds.

import { createOpencodeAdapter } from '@/adapters/opencode';
import { readHarnessesConfig } from '@/storage/harnesses';

import type { HarnessAdapter, HarnessId } from './types';

const adapters = new Map<HarnessId, Promise<HarnessAdapter>>();

async function buildAdapter(id: HarnessId): Promise<HarnessAdapter> {
  switch (id) {
    case 'opencode':
      return createOpencodeAdapter();

    // case "codex":
    //   return createCodexAdapter();
    // case "claude":
    //   return createClaudeAdapter();

    default:
      throw new Error(`No harness adapter registered for "${id}"`);
  }
}

/** Get (and lazily start) the adapter for a specific harness id. */
export function getAdapter(id: HarnessId): Promise<HarnessAdapter> {
  let pending = adapters.get(id);
  if (!pending) {
    pending = buildAdapter(id);
    adapters.set(id, pending);
  }
  return pending;
}

/**
 * Resolve whichever harness is active for a given workspace (or the global
 * default if no workspace is specified / configured). This is the single
 * entrypoint route handlers should use.
 */
export async function getActiveAdapter(
  workspaceId?: string,
): Promise<HarnessAdapter> {
  const config = await readHarnessesConfig();
  const harnessId =
    (workspaceId && config.workspaceHarness?.[workspaceId]) ||
    config.defaultHarness;
  return getAdapter(harnessId);
}
