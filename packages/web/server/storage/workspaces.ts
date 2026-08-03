// server/storage/workspaces.ts
//
// Minimal per PRD §5 (1b) scope — filesystem-backed CRUD for ~/.aero/workspaces.json.
// No schema versioning yet; that's Phase 2 (§5, "solidify storage schemas").

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { homedir } from 'node:os';
import { join } from 'node:path';

export interface Workspace {
  id: string;
  name: string;
  directory: string;
  /** Per-workspace harness override. Falls back to harnesses.json's default/workspaceHarness map if unset. */
  harness?: string;
  createdAt: number;
  updatedAt: number;
}

const AERO_DIR = join(homedir(), '.aero');
const WORKSPACES_PATH = join(AERO_DIR, 'workspaces.json');

async function readAll(): Promise<Workspace[]> {
  try {
    return JSON.parse(await readFile(WORKSPACES_PATH, 'utf-8'));
  } catch {
    return [];
  }
}

async function writeAll(workspaces: Workspace[]): Promise<void> {
  await mkdir(AERO_DIR, { recursive: true });
  await writeFile(
    WORKSPACES_PATH,
    JSON.stringify(workspaces, null, 2),
    'utf-8',
  );
}

export async function listWorkspaces(): Promise<Workspace[]> {
  return readAll();
}

export async function getWorkspace(id: string): Promise<Workspace | null> {
  return (await readAll()).find((w) => w.id === id) ?? null;
}

export async function createWorkspace(input: {
  name: string;
  directory: string;
  harness?: string;
}): Promise<Workspace> {
  const all = await readAll();
  const now = Date.now();
  const workspace: Workspace = {
    id: randomUUID(),
    ...input,
    createdAt: now,
    updatedAt: now,
  };
  all.push(workspace);
  await writeAll(all);
  return workspace;
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter((w) => w.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}
