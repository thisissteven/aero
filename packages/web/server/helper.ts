import net from 'node:net';
import { homedir } from 'node:os';
import { join } from 'node:path';
import z from 'zod';

import {
  AeroConversationTurn,
  AeroMessage,
  HarnessAdapter,
} from '@/server/services/harness/types';
import { normalizePath } from '@/server/shared';

/**
 * Checks if a specific port is free to use on 127.0.0.1.
 */
export function isPortAvailable(
  port: number,
  host = '127.0.0.1',
): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();

    server.once('error', () => resolve(false));
    server.once('listening', () => {
      server.close(() => resolve(true));
    });

    server.listen(port, host);
  });
}

/**
 * Finds a free available port starting from preferredPort up to maxPort.
 */
export async function findAvailablePort(
  preferredPort: number,
  maxPort = 60000,
  host = '127.0.0.1',
): Promise<number> {
  let port = preferredPort;
  while (port <= maxPort) {
    if (await isPortAvailable(port, host)) {
      return port;
    }
    port++;
  }
  throw new Error(
    `No available ports found between ${preferredPort} and ${maxPort}`,
  );
}

// Dynamically resolves to:
// Windows: C:/Users/<username>/.aero
// macOS:   /Users/<username>/.aero
// Linux:   /home/<username>/.aero
export const AERO_DIR = normalizePath(join(homedir(), '.aero'));

export const WORKSPACES_PATH = normalizePath(join(AERO_DIR, 'workspaces.json'));
export const HARNESSES_CONFIG_PATH = normalizePath(
  join(AERO_DIR, 'harnesses.json'),
);
export const CLAUDE_STORE_PATH = normalizePath(
  join(AERO_DIR, 'claude_sessions.json'),
);

export const PAGINATION_LIMIT = 10;
export const GET_ALL_LIMIT = 1000000000;
export const WORKSPACE_VISIBLE_SESSIONS_LIMIT = 3;

export const withPagination = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
) =>
  schema.extend({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(GET_ALL_LIMIT).optional(),
    search: z.string().optional(),
    directory: z.string().optional(),
  });

export type OpenCodePaginated<T> = {
  data: T[];
  cursor: {
    next?: string;
    previous?: string;
  };
};

export function groupMessages(messages: AeroMessage[]): AeroConversationTurn[] {
  const turns: AeroConversationTurn[] = [];

  for (const message of messages) {
    const previous = turns.at(-1);

    if (previous?.role === message.role) {
      previous.parts.push(...message.parts);
      continue;
    }

    turns.push({
      ...message,
      parts: [...message.parts],
      error: message.error?.data?.message ? message.error : undefined,
    });
  }

  return turns;
}

export function multiplyMessages(
  messages: AeroMessage[],
  multiplier = 15,
): AeroMessage[] {
  return Array.from({ length: multiplier }, (_, batch) =>
    messages.map((msg, index) => ({
      ...msg,
      id: `${msg.id}-${batch}-${crypto.randomUUID()}`,
      parts: msg.parts.map((part) => ({
        ...part,
        id: `${part.id}-${batch}-${crypto.randomUUID()}`,
      })),
      createdAt: msg.createdAt + batch * 1000,
    })),
  ).flat();
}

export async function waitForMessagePersistence(
  harness: HarnessAdapter,
  sessionId: string,
  maxRetries = 10,
  delayMs = 100,
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    const messages = await harness.listMessages(sessionId);
    if (messages.length > 0) return;
    await new Promise((res) => setTimeout(res, delayMs));
  }
}
