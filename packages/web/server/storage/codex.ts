// server/storage/codex.ts

import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { AERO_DIR } from '@/server/helper';
import type {
  AeroMessage,
  AeroSessionSummary,
} from '@/server/services/harness/types';
import { normalizePath } from '@/server/shared';

const CODEX_STORE_PATH = join(AERO_DIR, 'codex_sessions.json');

interface StoredCodexData {
  sessions: AeroSessionSummary[];
  archivedSessionIds: string[];
  messages: Record<string, AeroMessage[]>;
}

async function readStore(): Promise<StoredCodexData> {
  try {
    const raw = await readFile(CODEX_STORE_PATH, 'utf-8');
    const data: StoredCodexData = JSON.parse(raw);
    return {
      sessions: data.sessions || [],
      archivedSessionIds: data.archivedSessionIds || [],
      messages: data.messages || {},
    };
  } catch {
    return { sessions: [], archivedSessionIds: [], messages: {} };
  }
}

async function writeStore(data: StoredCodexData): Promise<void> {
  await mkdir(AERO_DIR, { recursive: true });
  await writeFile(CODEX_STORE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function listCodexSessions(
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

export async function listArchivedCodexSessions(): Promise<
  AeroSessionSummary[]
> {
  const store = await readStore();
  const archivedSet = new Set(store.archivedSessionIds);
  return store.sessions.filter((s) => archivedSet.has(s.id));
}

export async function getCodexSession(
  id: string,
): Promise<AeroSessionSummary | null> {
  const store = await readStore();
  return store.sessions.find((s) => s.id === id) ?? null;
}

export async function saveCodexSession(
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

export async function setCodexSessionArchived(
  id: string,
  archived: boolean,
): Promise<AeroSessionSummary> {
  const store = await readStore();
  const session = store.sessions.find((s) => s.id === id);
  if (!session) throw new Error(`Codex session not found: ${id}`);

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

export async function deleteCodexSession(id: string): Promise<boolean> {
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

export async function getCodexMessages(
  sessionId: string,
): Promise<AeroMessage[]> {
  const store = await readStore();
  return store.messages[sessionId] || [];
}

export async function appendCodexMessage(
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
