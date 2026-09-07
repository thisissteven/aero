import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { z } from 'zod';

import { SETTINGS_PATH } from '@/server/helper';

export const settingsSchema = z.object({
  goalMode: z.record(z.string(), z.boolean()),
  chatInputExpanded: z.record(z.string(), z.boolean()),
  permissionAutoAcceptSessions: z.record(z.string(), z.boolean()),
  pinnedSessionMessages: z.record(
    z.string(),
    z.record(z.string(), z.boolean()),
  ),

  // Future examples:
  // theme: z.enum(['light', 'dark', 'system']),
  // recentModels: z.array(z.string()),
});

export type AeroSettings = z.infer<typeof settingsSchema>;

export const DEFAULT_SETTINGS: AeroSettings = {
  goalMode: {},
  chatInputExpanded: {},
  permissionAutoAcceptSessions: {},
  pinnedSessionMessages: {},
};

type SettingsObject = Record<string, unknown>;

type SettingPath<T> = T extends readonly unknown[]
  ? []
  : T extends object
    ? {
        [K in keyof T & string]: [K, ...SettingPath<T[K]>];
      }[keyof T & string]
    : [];

export type AeroSettingPath = SettingPath<AeroSettings>;

type SettingValueAtPath<T, P extends readonly string[]> = P extends [
  infer K extends keyof T,
  ...infer Rest extends string[],
]
  ? Rest extends []
    ? T[K]
    : SettingValueAtPath<T[K], Rest>
  : never;

export type AeroSettingValue<P extends AeroSettingPath> = SettingValueAtPath<
  AeroSettings,
  P
>;

type SettingUpdate<P extends AeroSettingPath> = {
  path: P;
  value: AeroSettingValue<P> | undefined;
};

export type AeroSettingUpdate = AeroSettingPath extends infer P
  ? P extends AeroSettingPath
    ? SettingUpdate<P>
    : never
  : never;

function isObject(value: unknown): value is SettingsObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function getAtPath(root: unknown, path: readonly string[]): unknown {
  let current = root;

  for (const key of path) {
    if (!isObject(current)) {
      return undefined;
    }

    current = current[key];
  }

  return current;
}

function setAtPath(
  root: SettingsObject,
  path: readonly string[],
  value: unknown,
): void {
  let current = root;

  for (let index = 0; index < path.length - 1; index++) {
    const key = path[index];

    if (!isObject(current[key])) {
      current[key] = {};
    }

    current = current[key] as SettingsObject;
  }

  current[path[path.length - 1]] = value;
}

function deleteAtPath(root: SettingsObject, path: readonly string[]): void {
  let current = root;

  for (let index = 0; index < path.length - 1; index++) {
    const next = current[path[index]];

    if (!isObject(next)) {
      return;
    }

    current = next;
  }

  delete current[path[path.length - 1]];
}

function pruneEmptyObjects(value: unknown): void {
  if (!isObject(value)) {
    return;
  }

  for (const [key, child] of Object.entries(value)) {
    if (!isObject(child)) {
      continue;
    }

    pruneEmptyObjects(child);

    if (Object.keys(child).length === 0) {
      delete value[key];
    }
  }
}

async function readSettings(): Promise<AeroSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, 'utf8');
    const parsed: unknown = JSON.parse(raw);

    return settingsSchema.parse({
      ...structuredClone(DEFAULT_SETTINGS),
      ...(isObject(parsed) ? parsed : {}),
    });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return structuredClone(DEFAULT_SETTINGS);
    }

    throw error;
  }
}

async function saveSettings(settings: AeroSettings): Promise<void> {
  const validated = settingsSchema.parse(settings);

  await mkdir(dirname(SETTINGS_PATH), { recursive: true });

  const tempPath = `${SETTINGS_PATH}.tmp`;

  await writeFile(tempPath, `${JSON.stringify(validated, null, 2)}\n`, 'utf8');

  await rename(tempPath, SETTINGS_PATH);
}

/**
 * In-memory settings cache.
 *
 * The settings file is only read once per process.
 */
let settingsCache: AeroSettings | null = null;

/**
 * Prevent multiple concurrent initial reads.
 *
 * Without this, several requests arriving at startup could all call
 * readFile() before the first one populates the cache.
 */
let settingsLoadPromise: Promise<AeroSettings> | null = null;

/**
 * Serialize writes so concurrent updates cannot overwrite one another.
 */
let writeQueue: Promise<void> = Promise.resolve();

async function ensureSettings(): Promise<AeroSettings> {
  if (settingsCache) {
    return settingsCache;
  }

  if (!settingsLoadPromise) {
    settingsLoadPromise = readSettings().then((settings) => {
      settingsCache = settings;
      return settings;
    });
  }

  try {
    return await settingsLoadPromise;
  } finally {
    settingsLoadPromise = null;
  }
}

function enqueueSave(settings: AeroSettings): Promise<void> {
  const snapshot = structuredClone(settings);

  const savePromise = writeQueue.then(() => saveSettings(snapshot));

  // Keep the queue alive after a failure so one failed write doesn't
  // permanently block all future writes.
  writeQueue = savePromise.catch(() => {});

  return savePromise;
}

export async function getSettings(): Promise<AeroSettings> {
  return ensureSettings();
}

export async function getSetting<const P extends AeroSettingPath>(
  path: P,
): Promise<AeroSettingValue<P> | undefined> {
  const settings = await ensureSettings();

  return getAtPath(settings, path) as AeroSettingValue<P> | undefined;
}

export async function updateSetting<const P extends AeroSettingPath>(
  path: P,
  value: AeroSettingValue<P> | undefined,
): Promise<AeroSettingValue<P> | undefined> {
  const settings = await ensureSettings();
  const root = settings as unknown as SettingsObject;

  if (value === undefined) {
    deleteAtPath(root, path);
    pruneEmptyObjects(root);
  } else {
    setAtPath(root, path, value);
  }

  const validated = settingsSchema.parse(settings);

  // Keep all reads fast by updating the in-memory cache immediately.
  settingsCache = validated;

  // Persist updates sequentially so rapid concurrent updates cannot
  // clobber each other on disk.
  await enqueueSave(validated);

  return getAtPath(validated, path) as AeroSettingValue<P> | undefined;
}
