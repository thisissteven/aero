// server/services/harness/session-merger.ts

import { GET_ALL_LIMIT, PAGINATION_LIMIT } from '@/server/helper';
import type {
  AeroSessionSummary,
  HarnessAdapter,
  ListSessionsParams,
  PaginatedResponse,
} from '@/server/services/harness/types';

/**
 * Encodes an offset into a base64 cursor string for multi-adapter pagination.
 */
function encodeCursor(offset: number): string {
  return Buffer.from(JSON.stringify({ offset })).toString('base64');
}

/**
 * Decodes a base64 cursor back into an offset index.
 */
function decodeCursor(cursor?: string): number {
  if (!cursor) return 0;
  try {
    const parsed = JSON.parse(Buffer.from(cursor, 'base64').toString('utf-8'));
    return typeof parsed.offset === 'number' ? parsed.offset : 0;
  } catch {
    return 0;
  }
}

/**
 * Fetches sessions from ALL adapters, merges them by updatedAt timestamp,
 * and handles paginated slicing.
 */
export async function listSessionsAcrossAdapters(
  adapters: HarnessAdapter[],
  params: ListSessionsParams,
): Promise<PaginatedResponse<AeroSessionSummary>> {
  const { directory, limit = PAGINATION_LIMIT, cursor, search } = params;

  const offset = decodeCursor(cursor);

  // Use GET_ALL_LIMIT when aggregating across adapters to ensure full sorting
  // visibility across all harnesses.
  const listParams: ListSessionsParams = {
    directory,
    search,
    limit: GET_ALL_LIMIT,
  };

  const results = await Promise.allSettled(
    adapters.map((adapter) => adapter.listSessions(listParams)),
  );

  // Aggregate sessions into a single list
  const allSessions: AeroSessionSummary[] = [];
  for (const res of results) {
    if (res.status === 'fulfilled') {
      allSessions.push(...res.value.items);
    }
  }

  // Sort all merged sessions descending by `updatedAt`
  allSessions.sort((a, b) => b.updatedAt - a.updatedAt);

  // Apply window slicing for pagination
  const pageItems = allSessions.slice(offset, offset + limit);
  const hasMore = offset + limit < allSessions.length;
  const nextCursor = hasMore ? encodeCursor(offset + limit) : undefined;

  return {
    items: pageItems,
    nextCursor,
  };
}

export async function listArchivedSessionsAcrossAdapters(
  adapters: HarnessAdapter[],
): Promise<AeroSessionSummary[]> {
  const results = await Promise.allSettled(
    adapters.map((adapter) => adapter.listArchivedSessions()),
  );

  // Aggregate sessions into a single list
  const allSessions: AeroSessionSummary[] = [];
  for (const res of results) {
    if (res.status === 'fulfilled') {
      allSessions.push(...res.value);
    }
  }

  // Sort all merged sessions descending by `updatedAt`
  allSessions.sort((a, b) => b.updatedAt - a.updatedAt);

  return allSessions;
}
