// server/storage/harnesses.ts
//
// Deliberately minimal per PRD §5 (1b) — just enough to resolve "which
// harness is active for this workspace." Schema is expected to grow;
// don't over-build this.

import { readFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

import type { HarnessId } from '../services/harness/types';

interface HarnessesConfig {
  defaultHarness: HarnessId;
  registry: { id: HarnessId; label: string }[];
  workspaceHarness?: Record<string, HarnessId>;
}

const CONFIG_PATH = join(homedir(), '.aero', 'harnesses.json');

const DEFAULT_CONFIG: HarnessesConfig = {
  defaultHarness: 'opencode',
  registry: [
    { id: 'opencode', label: 'opencode' },
    { id: 'codex', label: 'Codex' },
    { id: 'claude', label: 'Claude Code' },
  ],
};

export async function readHarnessesConfig(): Promise<HarnessesConfig> {
  try {
    const raw = await readFile(CONFIG_PATH, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    // No file yet (or unreadable) — fall back to a hardcoded default so the
    // app still boots on a clean machine.
    return DEFAULT_CONFIG;
  }
}
