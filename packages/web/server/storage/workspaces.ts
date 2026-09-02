// server/storage/workspaces.ts

import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { AERO_DIR, WORKSPACES_PATH } from '@/server/helper';
import { getBasename, normalizePath } from '@/server/shared';

export interface AeroWorktree {
  id: string;
  name: string;
  directory: string;
  createdAt: number;
}

export interface AeroWorkspace {
  id: string;
  name: string;
  directory: string;
  worktrees: AeroWorktree[];
  createdAt: number;
  updatedAt: number;

  selectedColor?: string | null;
  selectedIcon?: string | null;
  defaultModel?: string | null;
}

async function readAll(): Promise<AeroWorkspace[]> {
  try {
    const raw = await readFile(WORKSPACES_PATH, 'utf-8');
    const data: AeroWorkspace[] = JSON.parse(raw);

    return (
      data
        .map((ws) => ({
          ...ws,
          directory: normalizePath(ws.directory),
          worktrees: (ws.worktrees || []).map((wt) => ({
            ...wt,
            directory: normalizePath(wt.directory),
          })),
        }))
        // exclude standalone sessions
        .filter((item) => !item.directory.includes('.aero/workspaces'))
    );
  } catch {
    return [];
  }
}

async function writeAll(workspaces: AeroWorkspace[]): Promise<void> {
  await mkdir(AERO_DIR, { recursive: true });
  await writeFile(
    WORKSPACES_PATH,
    JSON.stringify(workspaces, null, 2),
    'utf-8',
  );
}

export async function listWorkspaces(): Promise<AeroWorkspace[]> {
  return readAll();
}

export async function getWorkspace(id: string): Promise<AeroWorkspace | null> {
  return (await readAll()).find((w) => w.id === id) ?? null;
}

export async function getWorkspaceByDirectory(
  directory: string,
): Promise<AeroWorkspace | null> {
  return (
    (await readAll()).find(
      (w) =>
        w.directory === directory ||
        w.worktrees.some((wt) => wt.directory === directory),
    ) ?? null
  );
}

export async function createWorkspace(input: {
  name?: string;
  directory: string;
  worktrees?: Array<{ name?: string; directory: string }>;
}): Promise<AeroWorkspace> {
  const all = await readAll();
  const now = Date.now();
  const normalizedDir = normalizePath(input.directory);

  const existing = all.find((w) => w.directory === normalizedDir);

  const initialWorktreeInputs = [...(input.worktrees || [])];

  const hasRootWorktree = initialWorktreeInputs.some(
    (wt) => normalizePath(wt.directory) === normalizedDir,
  );

  if (!hasRootWorktree) {
    initialWorktreeInputs.unshift({
      name: input.name || getBasename(normalizedDir),
      directory: normalizedDir,
    });
  }

  // Workspace already exists → sync its worktrees
  if (existing) {
    const existingWorktreesByDir = new Map(
      existing.worktrees.map((wt) => [normalizePath(wt.directory), wt]),
    );

    const worktrees: AeroWorktree[] = initialWorktreeInputs.map((wt) => {
      const normWtDir = normalizePath(wt.directory);
      const existingWorktree = existingWorktreesByDir.get(normWtDir);

      if (existingWorktree) {
        return {
          ...existingWorktree,
          name: wt.name || existingWorktree.name || getBasename(normWtDir),
        };
      }

      return {
        id: randomUUID(),
        name: wt.name || getBasename(normWtDir),
        directory: normWtDir,
        createdAt: now,
      };
    });

    const updatedWorkspace: AeroWorkspace = {
      ...existing,
      name: input.name || existing.name,
      worktrees,
      updatedAt: now,
    };

    const index = all.indexOf(existing);
    all[index] = updatedWorkspace;

    await writeAll(all);

    return updatedWorkspace;
  }

  // Workspace doesn't exist → create it
  const worktrees: AeroWorktree[] = initialWorktreeInputs.map((wt) => {
    const normWtDir = normalizePath(wt.directory);

    return {
      id: randomUUID(),
      name: wt.name || getBasename(normWtDir),
      directory: normWtDir,
      createdAt: now,
    };
  });

  const workspace: AeroWorkspace = {
    id: randomUUID(),
    name: input.name || getBasename(normalizedDir),
    directory: normalizedDir,
    worktrees,
    createdAt: now,
    updatedAt: now,
  };

  all.push(workspace);

  await writeAll(all);

  return workspace;
}

export async function updateWorkspace(
  id: string,
  input: Partial<
    Pick<
      AeroWorkspace,
      'name' | 'directory' | 'selectedColor' | 'selectedIcon' | 'defaultModel'
    >
  >,
): Promise<AeroWorkspace | null> {
  const all = await readAll();
  const index = all.findIndex((w) => w.id === id);
  if (index === -1) return null;

  const current = all[index];

  const name = input.name ?? current.name;

  const directory = input.directory
    ? normalizePath(input.directory)
    : current.directory;

  const updated: AeroWorkspace = {
    ...current,
    ...input,
    name,
    directory: directory,
    worktrees: current.worktrees.map((wt) => ({
      ...wt,
      name: wt.directory === current.directory ? name : wt.name,
      directory: wt.directory === current.directory ? directory : wt.directory,
    })),
    updatedAt: Date.now(),
  };

  all[index] = updated;
  await writeAll(all);
  return updated;
}

export async function deleteWorkspace(id: string): Promise<boolean> {
  const all = await readAll();
  const next = all.filter((w) => w.id !== id);
  if (next.length === all.length) return false;
  await writeAll(next);
  return true;
}

export async function addWorktreeToWorkspace(
  workspaceId: string,
  worktreeInput: { name?: string; directory: string },
): Promise<AeroWorkspace | null> {
  const all = await readAll();
  const workspace = all.find((w) => w.id === workspaceId);
  if (!workspace) return null;

  const normDir = normalizePath(worktreeInput.directory);
  const exists = workspace.worktrees.some((wt) => wt.directory === normDir);

  if (!exists) {
    workspace.worktrees.push({
      id: randomUUID(),
      name: worktreeInput.name || getBasename(normDir),
      directory: normDir,
      createdAt: Date.now(),
    });
    workspace.updatedAt = Date.now();
    await writeAll(all);
  }

  return workspace;
}

export async function removeWorktreeFromWorkspace(
  workspaceId: string,
  worktreeIdOrDir: string,
): Promise<AeroWorkspace | null> {
  const all = await readAll();
  const workspace = all.find((w) => w.id === workspaceId);
  if (!workspace) return null;

  const normTarget = normalizePath(worktreeIdOrDir);

  workspace.worktrees = workspace.worktrees.filter(
    (wt) => wt.id !== worktreeIdOrDir && wt.directory !== normTarget,
  );

  workspace.updatedAt = Date.now();
  await writeAll(all);
  return workspace;
}

/**
 * Creates a unique workspace directory under .aero/workspaces/<uuid>
 * and registers it in workspaces storage.
 */
export async function createStandaloneWorkspace(
  name?: string,
): Promise<AeroWorkspace> {
  const workspaceDir = normalizePath(
    join(AERO_DIR, 'workspaces', randomUUID()),
  );

  // Ensure physical directory exists on disk
  await mkdir(workspaceDir, { recursive: true });

  // Register in workspaces storage using your existing storage method
  return createWorkspace({
    name: name || 'Standalone Session',
    directory: workspaceDir,
  });
}
