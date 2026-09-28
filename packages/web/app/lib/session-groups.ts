import {
  AeroSessionSummary,
  AeroWorkspaceSummary,
} from '@/server/services/harness/types';
import { dedupeWorktreesByDirectory } from '@/server/shared';

export type SessionGroupKey = 'pinned' | 'today' | 'yesterday' | 'older';

export interface SessionGroup {
  key: SessionGroupKey;
  sessions: AeroSessionSummary[];
}

export interface GroupSessionsOptions {
  now?: Date;
  /** IDs of pinned sessions. Pinned sessions are pulled out of the day groups. */
  pinnedSessions?: ReadonlySet<string>;
}

/**
 * Buckets sessions into Pinned / Today / Yesterday / Older. Pinned sessions are
 * removed from the day buckets and collected first. Day groups use the local
 * calendar day boundaries of `now`. Input order is preserved (the API returns
 * sessions sorted by `updatedAt` descending), and empty groups are dropped.
 */
export function groupSessionsByDay(
  sessions: AeroSessionSummary[],
  {
    now = new Date(),
    pinnedSessions = new Set<string>(),
  }: GroupSessionsOptions = {},
): SessionGroup[] {
  const startOfToday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  ).getTime();
  const startOfYesterday = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - 1,
  ).getTime();

  const groups: SessionGroup[] = [
    { key: 'pinned', sessions: [] },
    { key: 'today', sessions: [] },
    { key: 'yesterday', sessions: [] },
    { key: 'older', sessions: [] },
  ];

  for (const session of sessions) {
    if (pinnedSessions.has(session.id)) {
      groups[0].sessions.push(session);
    } else if (session.updatedAt >= startOfToday) {
      groups[1].sessions.push(session);
    } else if (session.updatedAt >= startOfYesterday) {
      groups[2].sessions.push(session);
    } else {
      groups[3].sessions.push(session);
    }
  }

  return groups.filter((group) => group.sessions.length > 0);
}

export interface WorkspaceSessionGroup {
  /** Workspace id when resolved, otherwise the raw directory. */
  key: string;
  workspace?: AeroWorkspaceSummary;
  directory: string;
  sessions: AeroSessionSummary[];
}

/**
 * Buckets sessions by the workspace they belong to. A session's `workspace` is
 * a directory, which may be the workspace root or one of its worktrees, so both
 * are indexed. Groups follow the workspace order passed in (the API already
 * returns workspaces in user order); sessions whose directory can't be resolved
 * to a known workspace are collected into fallback groups keyed by directory so
 * nothing is dropped. Input order is preserved within each group.
 */
export function groupSessionsByWorkspace(
  sessions: AeroSessionSummary[],
  workspaces: AeroWorkspaceSummary[],
): WorkspaceSessionGroup[] {
  const directoryToWorkspace = new Map<string, AeroWorkspaceSummary>();

  for (const workspace of workspaces) {
    if (workspace.directory) {
      directoryToWorkspace.set(workspace.directory, workspace);
    }

    for (const worktree of dedupeWorktreesByDirectory(workspace.worktrees)) {
      if (worktree.directory) {
        directoryToWorkspace.set(worktree.directory, workspace);
      }
    }
  }

  const groupsByKey = new Map<string, WorkspaceSessionGroup>();

  for (const session of sessions) {
    const workspace = directoryToWorkspace.get(session.workspace);
    const key = workspace ? workspace.id : session.workspace;

    let group = groupsByKey.get(key);

    if (!group) {
      group = {
        key,
        workspace,
        directory: session.workspace,
        sessions: [],
      };
      groupsByKey.set(key, group);
    }

    group.sessions.push(session);
  }

  const workspaceOrder = new Map<string, number>();
  workspaces.forEach((workspace, index) => {
    workspaceOrder.set(workspace.id, index);
  });

  return Array.from(groupsByKey.values()).sort((a, b) => {
    const aIndex = a.workspace
      ? (workspaceOrder.get(a.workspace.id) ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER;
    const bIndex = b.workspace
      ? (workspaceOrder.get(b.workspace.id) ?? Number.MAX_SAFE_INTEGER)
      : Number.MAX_SAFE_INTEGER;

    if (aIndex !== bIndex) return aIndex - bIndex;

    return a.directory.localeCompare(b.directory);
  });
}
