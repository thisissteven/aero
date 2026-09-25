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
  order?: number;
}

async function readAll(): Promise<AeroWorkspace[]> {
  try {
    const raw = await readFile(WORKSPACES_PATH, 'utf-8');
    const data: AeroWorkspace[] = JSON.parse(raw);

    const workspaces = data
      .map((ws) => ({
        ...ws,
        directory: normalizePath(ws.directory),
        worktrees: (ws.worktrees || []).map((wt) => ({
          ...wt,
          directory: normalizePath(wt.directory),
        })),
      }))
      // exclude standalone sessions
      .filter(
        (item) =>
          !item.directory.includes('.aero/workspaces') &&
          !item.directory.includes('.config/openchamber'),
      );

    // Backfill ordering for records persisted before the `order` field existed.
    // Preserve the previous recency ordering so nothing visibly moves.
    if (workspaces.some((ws) => typeof ws.order !== 'number')) {
      const byRecency = [...workspaces].sort(
        (a, b) => b.updatedAt - a.updatedAt,
      );
      const recencyIndex = new Map(
        byRecency.map((ws, index) => [ws.id, index]),
      );

      for (const workspace of workspaces) {
        if (typeof workspace.order !== 'number') {
          workspace.order = recencyIndex.get(workspace.id) ?? workspaces.length;
        }
      }
    }

    return workspaces;
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
  const all = await readAll();
  return all.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
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

  const minOrder = all.reduce<number | null>((min, item) => {
    if (typeof item.order !== 'number') return min;
    return min === null ? item.order : Math.min(min, item.order);
  }, null);

  const workspace: AeroWorkspace = {
    id: randomUUID(),
    name: input.name || getBasename(normalizedDir),
    directory: normalizedDir,
    worktrees,
    createdAt: now,
    updatedAt: now,
    order: (minOrder ?? 0) - 1,
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
      | 'name'
      | 'directory'
      | 'selectedColor'
      | 'selectedIcon'
      | 'defaultModel'
      | 'order'
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
 * Persists the user-defined workspace order. The provided ids are assigned
 * sequential `order` values by their position in the array. Any workspaces not
 * present in `ids` keep their relative order and are appended after.
 */
export async function reorderWorkspaces(
  ids: string[],
): Promise<AeroWorkspace[]> {
  const all = await readAll();

  const positionById = new Map(ids.map((id, index) => [id, index]));

  const next = [...all]
    .sort((a, b) => {
      const aIndex = positionById.get(a.id);
      const bIndex = positionById.get(b.id);

      if (aIndex === undefined && bIndex === undefined) return 0;
      if (aIndex === undefined) return 1;
      if (bIndex === undefined) return -1;
      return aIndex - bIndex;
    })
    .map((workspace, index) => ({ ...workspace, order: index }));

  await writeAll(next);
  return next;
}

/**
 * Creates a unique workspace directory under .aero/workspaces/session-<N>
 * and registers it in workspaces storage.
 *
 * Uses a monotonic counter file so session numbers are never reused,
 * even if a workspace directory is deleted. Keeps folder names short
 * and predictable to avoid model hallucination on long hashes/UUIDs.
 */
export async function createStandaloneWorkspace(
  name?: string,
): Promise<AeroWorkspace> {
  const workspacesRoot = normalizePath(join(AERO_DIR, 'workspaces'));
  await mkdir(workspacesRoot, { recursive: true });

  const sessionNumber = await getNextSessionNumber(workspacesRoot);
  const workspaceDir = normalizePath(
    join(workspacesRoot, `session-${sessionNumber}`),
  );

  await mkdir(workspaceDir, { recursive: true });

  return createWorkspace({
    name: name || `Session ${sessionNumber}`,
    directory: workspaceDir,
  });
}

/**
 * Reads and increments a monotonic counter stored at
 * .aero/workspaces/.counter. Returns the new session number.
 */
async function getNextSessionNumber(workspacesRoot: string): Promise<number> {
  const counterPath = join(workspacesRoot, '.counter');

  let current = 0;
  try {
    const raw = await readFile(counterPath, 'utf8');
    const parsed = parseInt(raw.trim(), 10);
    if (Number.isFinite(parsed) && parsed >= 0) {
      current = parsed;
    }
  } catch {
    // First run — no counter file yet.
  }

  const next = current + 1;
  await writeFile(counterPath, String(next), 'utf8');
  return next;
}
