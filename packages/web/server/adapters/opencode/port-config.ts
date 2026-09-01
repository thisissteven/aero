/* eslint-disable no-console */

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { OPENCODE_CONFIG_PATH } from '@/server/helper';

export type OpencodePoolKey = 'v1' | 'v2';

interface OpencodePortConfig {
  v1?: Record<string, number>;
  v2?: Record<string, number>;
}

/*
 * In-memory cache + a write queue.
 *
 * V1 and V2 pools both read/write this same file on boot. Without
 * serializing writes, two concurrent "read -> merge -> write" cycles
 * can race and one pool's saved port silently clobbers the other's.
 */
let cache: OpencodePortConfig | null = null;
let writeQueue: Promise<void> = Promise.resolve();

async function loadConfig(force = false): Promise<OpencodePortConfig> {
  if (cache && !force) {
    return cache;
  }

  try {
    const raw = await readFile(OPENCODE_CONFIG_PATH, 'utf8');
    const parsed = JSON.parse(raw) as unknown;

    cache =
      parsed && typeof parsed === 'object'
        ? (parsed as OpencodePortConfig)
        : {};
  } catch {
    // Missing file, unreadable, or corrupt JSON — start fresh.
    cache = {};
  }

  return cache;
}

export async function getSavedPort(
  poolKey: OpencodePoolKey,
  nodeId: number,
): Promise<number | undefined> {
  const config = await loadConfig();

  return config[poolKey]?.[String(nodeId)];
}

export async function saveManagedPort(
  poolKey: OpencodePoolKey,
  nodeId: number,
  port: number,
): Promise<void> {
  const task = async (): Promise<void> => {
    // Re-read (not the cache) so we merge against whatever the other
    // pool most recently wrote, rather than an in-memory snapshot.
    const config = await loadConfig(true);
    const existing = config[poolKey]?.[String(nodeId)];

    if (existing === port) {
      return;
    }

    const next: OpencodePortConfig = {
      ...config,
      [poolKey]: { ...(config[poolKey] ?? {}), [String(nodeId)]: port },
    };

    cache = next;

    await mkdir(dirname(OPENCODE_CONFIG_PATH), { recursive: true });
    await writeFile(
      OPENCODE_CONFIG_PATH,
      JSON.stringify(next, null, 2),
      'utf8',
    );
  };

  writeQueue = writeQueue.then(task, task).catch((error) => {
    console.error('[OpenCode Port Config] Failed to persist port:', error);
  });

  return writeQueue;
}
