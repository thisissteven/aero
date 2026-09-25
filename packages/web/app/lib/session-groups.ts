import { AeroSessionSummary } from '@/server/services/harness/types';

export type SessionGroupKey = 'today' | 'yesterday' | 'older';

export interface SessionGroup {
  key: SessionGroupKey;
  sessions: AeroSessionSummary[];
}

/**
 * Buckets sessions into Today / Yesterday / Older using the local calendar day
 * boundaries of `now`. Input order is preserved (the API returns sessions
 * sorted by `updatedAt` descending), and empty groups are dropped.
 */
export function groupSessionsByDay(
  sessions: AeroSessionSummary[],
  now: Date = new Date(),
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
    { key: 'today', sessions: [] },
    { key: 'yesterday', sessions: [] },
    { key: 'older', sessions: [] },
  ];

  for (const session of sessions) {
    if (session.updatedAt >= startOfToday) groups[0].sessions.push(session);
    else if (session.updatedAt >= startOfYesterday)
      groups[1].sessions.push(session);
    else groups[2].sessions.push(session);
  }

  return groups.filter((group) => group.sessions.length > 0);
}
