// server/storage/claude.ts

import { mkdir, readFile, writeFile } from 'node:fs/promises';

import { AERO_DIR, CLAUDE_STORE_PATH } from '@/server/helper';
import type {
  AeroMessage,
  AeroSessionSummary,
} from '@/server/services/harness/types';
import { normalizePath } from '@/server/shared';

interface StoredClaudeData {
  sessions: AeroSessionSummary[];
  archivedSessionIds: string[];
  messages: Record<string, AeroMessage[]>;
}

async function readStore(): Promise<StoredClaudeData> {
  try {
    const raw = await readFile(CLAUDE_STORE_PATH, 'utf-8');
    const data: StoredClaudeData = JSON.parse(raw);
    return {
      sessions: data.sessions || [],
      archivedSessionIds: data.archivedSessionIds || [],
      messages: data.messages || {},
    };
  } catch {
    return { sessions: [], archivedSessionIds: [], messages: {} };
  }
}

async function writeStore(data: StoredClaudeData): Promise<void> {
  await mkdir(AERO_DIR, { recursive: true });
  await writeFile(CLAUDE_STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function listClaudeSessions(
  directory?: string,
): Promise<AeroSessionSummary[]> {
  const store = await readStore();
  const archivedSet = new Set(store.archivedSessionIds);
  let active = store.sessions.filter((s) => !archivedSet.has(s.id));

  if (directory) {
    const norm = normalizePath(directory);
    active = active.filter((s) => normalizePath(s.workspace) === norm);
  }

  return active;
}

export async function listArchivedClaudeSessions(): Promise<
  AeroSessionSummary[]
> {
  const store = await readStore();
  const archivedSet = new Set(store.archivedSessionIds);
  return store.sessions.filter((s) => archivedSet.has(s.id));
}

export async function getClaudeSession(
  id: string,
): Promise<AeroSessionSummary | null> {
  const store = await readStore();
  return store.sessions.find((s) => s.id === id) ?? null;
}

export async function saveClaudeSession(
  session: AeroSessionSummary,
): Promise<AeroSessionSummary> {
  const store = await readStore();
  const index = store.sessions.findIndex((s) => s.id === session.id);
  if (index >= 0) {
    store.sessions[index] = session;
  } else {
    store.sessions.push(session);
  }
  await writeStore(store);
  return session;
}

export async function setClaudeSessionArchived(
  id: string,
  archived: boolean,
): Promise<AeroSessionSummary> {
  const store = await readStore();
  const session = store.sessions.find((s) => s.id === id);
  if (!session) throw new Error(`Claude session not found: ${id}`);

  const archivedSet = new Set(store.archivedSessionIds);
  if (archived) {
    archivedSet.add(id);
  } else {
    archivedSet.delete(id);
  }
  store.archivedSessionIds = Array.from(archivedSet);
  session.updatedAt = Date.now();
  await writeStore(store);
  return session;
}

export async function deleteClaudeSession(id: string): Promise<boolean> {
  const store = await readStore();
  const beforeLen = store.sessions.length;
  store.sessions = store.sessions.filter((s) => s.id !== id);
  store.archivedSessionIds = store.archivedSessionIds.filter(
    (sId) => sId !== id,
  );
  delete store.messages[id];
  await writeStore(store);
  return store.sessions.length < beforeLen;
}

export async function getClaudeMessages(
  sessionId: string,
): Promise<AeroMessage[]> {
  const store = await readStore();
  return store.messages[sessionId] || [];
}

export async function appendClaudeMessage(
  sessionId: string,
  message: AeroMessage,
): Promise<void> {
  const store = await readStore();
  if (!store.messages[sessionId]) {
    store.messages[sessionId] = [];
  }
  store.messages[sessionId].push(message);

  const session = store.sessions.find((s) => s.id === sessionId);
  if (session) {
    session.updatedAt = Date.now();
  }

  await writeStore(store);
}
