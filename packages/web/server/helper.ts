import { homedir } from 'node:os';
import { join } from 'node:path';
import z from 'zod';

import {
  AeroConversationTurn,
  AeroMessage,
  HarnessAdapter,
} from '@/server/services/harness/types';
import { normalizePath } from '@/server/shared';

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
export const WORKSPACE_VISIBLE_SESSIONS_LIMIT = 5;

export const withPagination = <T extends z.ZodRawShape>(
  schema: z.ZodObject<T>,
) =>
  schema.extend({
    cursor: z.string().optional(),
    limit: z.coerce.number().min(1).max(100).optional(),
    search: z.string().optional(),
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
      id: message.id,
      role: message.role,
      parts: [...message.parts],
      createdAt: message.createdAt,
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
