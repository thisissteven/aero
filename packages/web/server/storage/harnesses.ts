// server/storage/harnesses.ts

import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { AERO_DIR, HARNESSES_CONFIG_PATH } from '@/server/helper';

import type { HarnessId } from '../services/harness/types';

interface HarnessesConfig {
  defaultHarness: HarnessId;
  registry: { id: HarnessId; label: string }[];
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
