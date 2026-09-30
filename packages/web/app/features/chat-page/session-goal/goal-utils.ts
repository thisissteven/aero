// app/features/chat-page/session-goal/goal-utils.ts
//
// Shared parsing/presentation helpers for the session goal UI.

import type {
  AeroGoalPayload,
  AeroGoalStatus,
} from '@/server/services/goal/types';

export { getSessionGoal } from '@/server/services/goal/types';
export type { AeroGoalPayload, AeroGoalStatus };

export const SESSION_GOAL_OBJECTIVE_CHAR_LIMIT = 5_000;

// Presentation mapping for the goal status across chat and composer surfaces.
// Colors are theme tokens from the aero theme.
export const sessionGoalStatusColor: Record<AeroGoalStatus, string> = {
  active: 'var(--accent)',
  paused: 'var(--muted)',
  blocked: 'var(--warning)',
  budgetLimited: 'var(--warning)',
  complete: 'var(--success)',
};

export const sessionGoalStatusLabelKey: Record<AeroGoalStatus, string> = {
  active: 'sessionGoal.status.active',
  paused: 'sessionGoal.status.paused',
  blocked: 'sessionGoal.status.blocked',
  budgetLimited: 'sessionGoal.status.budgetLimited',
  complete: 'sessionGoal.status.complete',
};

export function formatGoalTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 10_000) return `${Math.round(count / 1000)}K`;
  if (count >= 1_000) return `${(count / 1000).toFixed(1)}K`;
  return String(count);
}

const TRIM_MARKER =
  '\n\n[… objective trimmed for the auditor — the full text was delivered in the chat message …]\n\n';

/** Client-side objective fitting: head+tail excerpt when over the limit. */
export function fitGoalObjective(raw: string): string {
  if (raw.length <= SESSION_GOAL_OBJECTIVE_CHAR_LIMIT) return raw;
  const half = Math.max(
    0,
    Math.floor((SESSION_GOAL_OBJECTIVE_CHAR_LIMIT - TRIM_MARKER.length) / 2),
  );
  return `${raw.slice(0, half)}${TRIM_MARKER}${raw.slice(-half)}`;
}

export type { AeroGoalPayload as SessionGoalPayload };
