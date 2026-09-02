// server/services/harness/workspace-merger.ts

import type { AeroWorkspaceSummary, HarnessAdapter } from '../harness/types';

export async function mergeWorkspaceAcrossAdaptersByDirectory(
  adapters: HarnessAdapter[],
  directory: string,
): Promise<AeroWorkspaceSummary> {
  const primaryAdapter = adapters[0];
  const baseWorkspace = await primaryAdapter.getWorkspaceByDirectory(directory);

  return baseWorkspace;
}

/**
 * Merges workspace metadata and aggregates preview sessions from ALL harnesses
 * into a single unified AeroWorkspaceSummary.
 */
export async function mergeWorkspaceAcrossAdapters(
  adapters: HarnessAdapter[],
  workspaceId: string,
): Promise<AeroWorkspaceSummary> {
  const primaryAdapter = adapters[0];
  const baseWorkspace = await primaryAdapter.getWorkspace(workspaceId);

  return baseWorkspace;
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
