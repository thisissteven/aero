// app/hooks/api/goals.ts
//
// File-backed goal objectives. The objective TEXT lives in a server-side file
// keyed by the session id (one goal per session; a new goal overwrites the old
// file). Goal metadata only carries an `objectiveFile: true` flag so it stays
// light for session.updated fanout.

import { useQuery } from '@tanstack/react-query';

import { honoClient } from '@/app/lib';

const $goals = honoClient.api.goals;

export const goalKeys = {
  objective: (sessionId: string) => ['goals', 'objective', sessionId] as const,
};

const objectiveUrl = (sessionId: string) => $goals.objective[':sessionId'];

/** Write the session's objective file; false when the write did not land. */
export async function writeGoalObjectiveFile(
  sessionId: string,
  content: string,
): Promise<boolean> {
  try {
    const response = await objectiveUrl(sessionId).$put({
      param: { sessionId },
      json: { content },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/** Best-effort delete; a failure leaves an orphaned file the next goal overwrites. */
export function deleteGoalObjectiveFile(sessionId: string): void {
  void objectiveUrl(sessionId)
    .$delete({ param: { sessionId } })
    .catch(() => undefined);
}

/** Fetch the file-backed objective text; null when unavailable. */
export async function fetchGoalObjectiveContent(
  sessionId: string,
): Promise<string | null> {
  try {
    const response = await objectiveUrl(sessionId).$get({
      param: { sessionId },
    });
    if (!response.ok) return null;
    const parsed = (await response.json()) as { content?: unknown };
    return typeof parsed.content === 'string' ? parsed.content : null;
  } catch {
    return null;
  }
}

export function useGoalObjectiveContent(sessionId: string, enabled: boolean) {
  return useQuery({
    queryKey: goalKeys.objective(sessionId),
    enabled: Boolean(sessionId) && enabled,
    staleTime: 30_000,
    queryFn: () => fetchGoalObjectiveContent(sessionId),
  });
}
