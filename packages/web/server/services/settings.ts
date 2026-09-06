import { mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { SETTINGS_PATH } from '@/server/helper';

export interface AeroSettings {
  goalMode: Record<string, boolean>;
  chatInputExpanded: Record<string, boolean>;
  permissionAutoAcceptSessions: Record<string, boolean>;
}

const DEFAULT_SETTINGS: AeroSettings = {
  goalMode: {},
  chatInputExpanded: {},
  permissionAutoAcceptSessions: {},
};

export type BooleanSetting =
  'goalMode' | 'chatInputExpanded' | 'permissionAutoAcceptSessions';

function parseRecord<T extends Record<string, boolean>>(value: unknown): T {
  return value && typeof value === 'object' ? (value as T) : ({} as T);
}

export async function getSettings(): Promise<AeroSettings> {
  try {
    const raw = await readFile(SETTINGS_PATH, 'utf8');
    const parsed = JSON.parse(raw) as Partial<AeroSettings>;

    return {
      goalMode: parseRecord(parsed.goalMode),
      chatInputExpanded: parseRecord(parsed.chatInputExpanded),
      permissionAutoAcceptSessions: parseRecord(
        parsed.permissionAutoAcceptSessions,
      ),
    };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') {
      return structuredClone(DEFAULT_SETTINGS);
    }

    throw error;
  }
}

export async function toggleSetting(
  setting: BooleanSetting,
  key: string,
): Promise<boolean> {
  const current = await getSetting(setting, key);
  const enabled = current !== true;

  await updateSetting(setting, key, enabled ? true : undefined);

  return enabled;
}

async function saveSettings(settings: AeroSettings) {
  await mkdir(dirname(SETTINGS_PATH), { recursive: true });

  const tempPath = `${SETTINGS_PATH}.tmp`;

  await writeFile(tempPath, JSON.stringify(settings, null, 2) + '\n', 'utf8');

  await rename(tempPath, SETTINGS_PATH);
}

type RecordSettingKey = {
  [K in keyof AeroSettings]: AeroSettings[K] extends Record<string, boolean>
    ? K
    : never;
}[keyof AeroSettings];

function getRecordSetting(
  settings: AeroSettings,
  setting: RecordSettingKey,
): Record<string, boolean> {
  return settings[setting] as Record<string, boolean>;
}

export async function updateSetting<K extends RecordSettingKey>(
  setting: K,
  key: string,
  value: boolean | undefined,
): Promise<boolean | undefined> {
  const settings = await getSettings();
  const record = getRecordSetting(settings, setting);

  if (value === undefined) {
    delete record[key];
  } else {
    record[key] = value;
  }

  await saveSettings(settings);

  return value;
}

export async function getSetting<K extends RecordSettingKey>(
  setting: K,
  key: string,
): Promise<boolean | undefined> {
  const settings = await getSettings();

  return getRecordSetting(settings, setting)[key];
}

export async function isPermissionAutoAcceptEnabled(
  sessionId: string,
): Promise<boolean> {
  return (await getSetting('permissionAutoAcceptSessions', sessionId)) === true;
}

export async function setPermissionAutoAccept(
  sessionId: string,
  enabled: boolean,
): Promise<boolean> {
  await updateSetting(
    'permissionAutoAcceptSessions',
    sessionId,
    enabled ? true : undefined,
  );

  return enabled;
}

export async function togglePermissionAutoAccept(
  sessionId: string,
): Promise<boolean> {
  const current = await getSetting('permissionAutoAcceptSessions', sessionId);

  const enabled = current !== true;

  await updateSetting(
    'permissionAutoAcceptSessions',
    sessionId,
    enabled ? true : undefined,
  );

  return enabled;
}
