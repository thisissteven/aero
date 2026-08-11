// server/services/harness/registry.ts
//
// The only place that knows adapters exist. Routes call getActiveAdapter()
// and never see harness-specific code. Adding codex/claude later means:
//   1. write server/adapters/codex implementing HarnessAdapter
//   2. add a case to buildAdapter() below
// No route or frontend change required if the interface holds.

import type { HarnessAdapter, HarnessId } from './types';
import { createOpencodeAdapter } from '../../adapters/opencode';
import { readHarnessesConfig } from '../../storage/harnesses';

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
 * Resolve the harness adapter for a session, or fall back to the global default
 * if no harness ID / session is provided.
 */
export async function getActiveAdapter(
  sessionOrHarnessId?: { harness?: HarnessId } | HarnessId,
): Promise<HarnessAdapter> {
  let harnessId: HarnessId | undefined;

  if (typeof sessionOrHarnessId === 'string') {
    harnessId = sessionOrHarnessId;
  } else if (sessionOrHarnessId && sessionOrHarnessId.harness) {
    harnessId = sessionOrHarnessId.harness;
  }

  if (!harnessId) {
    const config = await readHarnessesConfig();
    harnessId = config.defaultHarness;
  }

  return getAdapter(harnessId);
}
