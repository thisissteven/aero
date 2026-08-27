import { appendFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';

const LOG_FILE = resolve(process.cwd(), '.aero/debug.log');

function serialize(value: unknown): string {
  if (value instanceof Error) {
    return JSON.stringify(
      {
        name: value.name,
        message: value.message,
        stack: value.stack,
        cause: value.cause,
      },
      null,
      2,
    );
  }

  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}

export async function debugLog(scope: string, message: string, data?: unknown) {
  const timestamp = new Date().toISOString();

  const output = [
    `[${timestamp}] [${scope}] ${message}`,
    data !== undefined ? serialize(data) : '',
  ]
    .filter(Boolean)
    .join('\n');

  try {
    await mkdir(dirname(LOG_FILE), { recursive: true });
    await appendFile(LOG_FILE, `${output}\n\n`, 'utf8');
  } catch (error) {
    console.error('[DEBUG LOGGER] Failed to write log:', error);
  }
}
