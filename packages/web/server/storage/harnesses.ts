// server/storage/harnesses.ts
//
// Deliberately minimal per PRD §5 (1b) — just enough to resolve "which
// harness is active for this workspace." Schema is expected to grow;
// don't over-build this.

import { readFile } from 'node:fs/promises';
import { mkdir } from 'node:fs/promises';
import { writeFile } from 'node:fs/promises';

import { AERO_DIR, HARNESSES_CONFIG_PATH } from '@/server/helper';

import type { HarnessId } from '../services/harness/types';

interface HarnessesConfig {
  defaultHarness: HarnessId;
  registry: { id: HarnessId; label: string }[];
  workspaceHarness?: Record<string, HarnessId>;
}

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
    const raw = await readFile(HARNESSES_CONFIG_PATH, 'utf-8');
    return { ...DEFAULT_CONFIG, ...JSON.parse(raw) };
  } catch {
    // No file yet (or unreadable) — fall back to a hardcoded default so the
    // app still boots on a clean machine.
    return DEFAULT_CONFIG;
  }
}

export async function writeHarnessesConfig(
  config: Partial<HarnessesConfig>,
): Promise<HarnessesConfig> {
  const current = await readHarnessesConfig();
  const updated: HarnessesConfig = {
    ...current,
    ...config,
  };

  await mkdir(AERO_DIR, { recursive: true });
  await writeFile(
    HARNESSES_CONFIG_PATH,
    JSON.stringify(updated, null, 2),
    'utf-8',
  );

  return updated;
}
