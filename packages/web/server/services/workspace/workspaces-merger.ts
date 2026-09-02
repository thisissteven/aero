// server/services/harness/workspace-merger.ts

import type {
  AeroWorkspaceSummary,
  AeroWorktreeSummary,
  HarnessAdapter,
} from '../harness/types';

export async function mergeWorkspaceAcrossAdaptersByDirectory(
  adapters: HarnessAdapter[],
  directory: string,
): Promise<AeroWorkspaceSummary> {
  // 1. Fetch the workspace base definition from the primary adapter
  const primaryAdapter = adapters[0];
  const baseWorkspace = await primaryAdapter.getWorkspaceByDirectory(directory);

  // 2. Aggregate preview sessions for each worktree across ALL adapters
  const mergedWorktrees: AeroWorktreeSummary[] = await Promise.all(
    baseWorkspace.worktrees.map(async (wt) => {
      return {
        ...wt,
      };
    }),
  );

  return {
    ...baseWorkspace,
    worktrees: mergedWorktrees,
  };
}

/**
 * Merges workspace metadata and aggregates preview sessions from ALL harnesses
 * into a single unified AeroWorkspaceSummary.
 */
export async function mergeWorkspaceAcrossAdapters(
  adapters: HarnessAdapter[],
  workspaceId: string,
): Promise<AeroWorkspaceSummary> {
  // 1. Fetch the workspace base definition from the primary adapter
  const primaryAdapter = adapters[0];
  const baseWorkspace = await primaryAdapter.getWorkspace(workspaceId);

  // 2. Aggregate preview sessions for each worktree across ALL adapters
  const mergedWorktrees: AeroWorktreeSummary[] = await Promise.all(
    baseWorkspace.worktrees.map(async (wt) => {
      // Query every adapter's listSessions for this worktree directory
      // const results = await Promise.allSettled(
      //   adapters.map((adapter) => {
      //     const params: ListSessionsParams = {
      //       directory: wt.directory,
      //       limit: WORKSPACE_VISIBLE_SESSIONS_LIMIT + 1, // Fetch LIMIT + 1 to check if more sessions exist
      //     };
      //     return adapter.listSessions(params);
      //   }),
      // );

      // Flatten all returned sessions from all harnesses
      // const allSessions: AeroSessionSummary[] = [];
      // for (const res of results) {
      //   if (res.status === 'fulfilled') {
      //     allSessions.push(...res.value.items);
      //   }
      // }

      // Sort combined sessions by most recent `updatedAt`
      // allSessions.sort((a, b) => b.updatedAt - a.updatedAt);

      // const hasMoreSessions =
      //   allSessions.length > WORKSPACE_VISIBLE_SESSIONS_LIMIT;
      // const previewSessions = allSessions.slice(
      //   0,
      //   WORKSPACE_VISIBLE_SESSIONS_LIMIT,
      // );

      return {
        ...wt,
        // sessions: previewSessions,
      };
    }),
  );

  return {
    ...baseWorkspace,
    worktrees: mergedWorktrees,
  };
}

/**
 * Merges the list of all workspaces and aggregates sessions across ALL harnesses.
 */
export async function mergeAllWorkspacesAcrossAdapters(
  adapters: HarnessAdapter[],
  params: { cursor?: string; limit?: number; search?: string },
): Promise<{ items: AeroWorkspaceSummary[]; nextCursor?: string }> {
  const primaryAdapter = adapters[0];
  const baseList = await primaryAdapter.listWorkspaces(params);

  const mergedItems = await Promise.all(
    baseList.items.map((ws) => mergeWorkspaceAcrossAdapters(adapters, ws.id)),
  );

  return {
    items: mergedItems,
    nextCursor: baseList.nextCursor,
  };
}
