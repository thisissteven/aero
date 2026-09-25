import { AeroSessionSummary } from '@/server/services/harness/types';

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
