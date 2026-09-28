// server/services/harness/session-merger.ts

import { GET_ALL_LIMIT, PAGINATION_LIMIT } from '@/server/helper';
import type {
  AeroSessionStatus,
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
 * Attaches live status to each session by asking its adapter for the status map
 * of the session's workspace (the underlying harness reports status per
 * workspace directory). Calls are batched per adapter + directory so a page
 * only costs one status request per distinct workspace. Failures are ignored so
 * a status outage never breaks listing.
 */
async function attachSessionStatus(
  adapters: HarnessAdapter[],
  sessions: AeroSessionSummary[],
): Promise<void> {
  if (sessions.length === 0) return;

  const adapterById = new Map(adapters.map((adapter) => [adapter.id, adapter]));

  const batches = new Map<
    string,
    {
      adapter: HarnessAdapter;
      directory: string;
      sessions: AeroSessionSummary[];
    }
  >();

  for (const session of sessions) {
    const adapter = adapterById.get(session.harnessId);
    if (!adapter || !session.workspace) continue;

    const key = `${session.harnessId}::${session.workspace}`;
    const batch = batches.get(key);

    if (batch) {
      batch.sessions.push(session);
    } else {
      batches.set(key, {
        adapter,
        directory: session.workspace,
        sessions: [session],
      });
    }
  }

  await Promise.all(
    Array.from(batches.values()).map(
      async ({ adapter, directory, sessions }) => {
        try {
          const statusMap = await adapter.getSessionStatus(directory);
          for (const session of sessions) {
            const status = statusMap[session.id];
            if (status) session.status = status as AeroSessionStatus;
          }
        } catch {
          //
        }
      },
    ),
  );
}

/**
 * Fetches sessions from ALL adapters, merges them by updatedAt timestamp,
 * and handles paginated slicing.
 */
export async function listSessionsAcrossAdapters(
  adapters: HarnessAdapter[],
  params: ListSessionsParams,
): Promise<PaginatedResponse<AeroSessionSummary>> {
  const {
    directory,
    limit = PAGINATION_LIMIT,
    cursor,
    search,
    childSessions,
    archived,
    childSessionsOnly,
  } = params;

  const offset = decodeCursor(cursor);

  // Use GET_ALL_LIMIT when aggregating across adapters to ensure full sorting
  // visibility across all harnesses.
  const listParams: ListSessionsParams = {
    directory,
    search,
    limit: GET_ALL_LIMIT,
    archived,
    childSessions,
    childSessionsOnly,
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

  // Child-session lists (the subagents UI) need live status to render the
  // working indicator. Decorate only the current page to keep the cost bounded.
  if (childSessionsOnly) {
    await attachSessionStatus(adapters, pageItems);
  }

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
