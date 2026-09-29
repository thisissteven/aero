// github/checks.ts
//
// Aggregates GitHub check runs (Actions) and classic commit statuses into the
// summary the UI renders as a checks chip.

export type CheckState = 'success' | 'failure' | 'pending' | 'unknown';

export interface CheckRunSummary {
  state: CheckState;
  total: number;
  success: number;
  failure: number;
  /** Union of in-progress, queued, and not-yet-concluded runs. */
  pending: number;
  inProgress: number;
  queued: number;
  /** Earliest start among in-progress runs, for "running for N minutes". */
  startedAt?: string;
}

export interface GitHubCheckRun {
  id?: number;
  name?: string | null;
  status?: string | null;
  conclusion?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
  app?: { id?: number; slug?: string | null } | null;
}

function deriveState(
  failure: number,
  pending: number,
  total: number,
): CheckState {
  if (failure > 0) return 'failure';
  if (pending > 0) return 'pending';
  return total > 0 ? 'success' : 'unknown';
}

/**
 * A re-run leaves the previous completed run in the `listForRef` payload
 * alongside the new in-progress one. GitHub's own UI shows only the latest run
 * per (app, name), so mirror that — otherwise the counts disagree with what
 * the user sees on github.com.
 */
export function dedupeCheckRuns<T extends GitHubCheckRun>(checkRuns: T[]): T[] {
  const byName = new Map<string, T>();

  for (const run of checkRuns) {
    const key = `${run?.app?.id ?? run?.app?.slug ?? ''}::${run?.name ?? ''}`;
    const previous = byName.get(key);
    if (!previous) {
      byName.set(key, run);
      continue;
    }

    const previousStartedAt = Date.parse(previous.started_at || '') || 0;
    const startedAt = Date.parse(run.started_at || '') || 0;
    if (
      startedAt > previousStartedAt ||
      (startedAt === previousStartedAt && (run.id ?? 0) > (previous.id ?? 0))
    ) {
      byName.set(key, run);
    }
  }

  return Array.from(byName.values());
}

export function summarizeCheckRuns(
  checkRuns: GitHubCheckRun[],
): CheckRunSummary {
  const counts = {
    success: 0,
    failure: 0,
    pending: 0,
    inProgress: 0,
    queued: 0,
  };
  let startedAt: string | null = null;

  for (const run of checkRuns) {
    if (run.status === 'in_progress') {
      counts.pending += 1;
      counts.inProgress += 1;
      const runStartedAt =
        typeof run.started_at === 'string' ? run.started_at : null;
      if (runStartedAt && (!startedAt || runStartedAt < startedAt)) {
        startedAt = runStartedAt;
      }
      continue;
    }

    if (run.status === 'queued') {
      counts.pending += 1;
      counts.queued += 1;
      continue;
    }

    if (!run.conclusion) {
      counts.pending += 1;
      continue;
    }

    if (
      run.conclusion === 'success' ||
      run.conclusion === 'neutral' ||
      run.conclusion === 'skipped'
    ) {
      counts.success += 1;
    } else {
      counts.failure += 1;
    }
  }

  const total = counts.success + counts.failure + counts.pending;
  return {
    state: deriveState(counts.failure, counts.pending, total),
    total,
    ...counts,
    ...(startedAt ? { startedAt } : {}),
  };
}

/** Fallback for repos that use commit statuses instead of check runs. */
export function summarizeCombinedStatuses(
  statuses: Array<{ state?: string | null }>,
): CheckRunSummary {
  const counts = { success: 0, failure: 0, pending: 0 };

  for (const status of statuses) {
    if (status.state === 'success') counts.success += 1;
    else if (status.state === 'failure' || status.state === 'error')
      counts.failure += 1;
    else if (status.state === 'pending') counts.pending += 1;
  }

  const total = counts.success + counts.failure + counts.pending;
  return {
    state: deriveState(counts.failure, counts.pending, total),
    total,
    ...counts,
    inProgress: counts.pending,
    queued: 0,
  };
}
