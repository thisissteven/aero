// server/services/goal/types.ts
//
// The goal payload that rides `session.metadata.aero.goal`. The runtime and the
// UI both parse it; the runtime is the only writer of its accounting fields.

import type { SessionMetadata } from '@/server/types/opencode-sdk';

export type AeroGoalStatus =
  | 'active'
  | 'paused'
  | 'blocked'
  | 'budgetLimited'
  | 'complete';

export const GOAL_STATUSES: AeroGoalStatus[] = [
  'active',
  'paused',
  'blocked',
  'budgetLimited',
  'complete',
];

export const GOAL_OBJECTIVE_CHAR_LIMIT = 5_000;

export const REASON_CHAR_LIMIT = 200;

export interface AeroGoalPayload {
  /** Opaque per-logical-goal id; stale-write guard. */
  id: string;
  /** Inline user text (fallback). Empty when `objectiveFile` is true. */
  objective: string;
  /** True when the objective text lives in a server-side file keyed by session id. */
  objectiveFile: boolean;
  status: AeroGoalStatus;
  tokenBudget: number | null;
  tokensUsed: number;
  tokensBaseline: number;
  tokensCommitted: number;
  turnsUsed: number;
  auditFailStreak: number;
  statusReason: string;
  evaluationProviderID: string;
  evaluationModelID: string;
  lastAccountedMessageID: string;
  createdAt: number;
  updatedAt: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

export const isGoalStatus = (value: unknown): value is AeroGoalStatus =>
  typeof value === 'string' && (GOAL_STATUSES as string[]).includes(value);

const asCount = (value: unknown): number =>
  typeof value === 'number' && Number.isFinite(value) && value > 0
    ? Math.floor(value)
    : 0;

/**
 * Normalize the raw `metadata.aero.goal` object into a payload, or null when it
 * is missing/malformed. Mirrors the UI parser so both sides agree on validity.
 */
export function parseGoal(metadata: unknown): AeroGoalPayload | null {
  if (!isRecord(metadata)) return null;
  const aero = metadata.aero;
  if (!isRecord(aero)) return null;
  const goal = aero.goal;
  if (!isRecord(goal)) return null;

  const id = typeof goal.id === 'string' ? goal.id : '';
  const objective =
    typeof goal.objective === 'string' ? goal.objective.trim() : '';
  const objectiveFile = goal.objectiveFile === true;
  if (!id || (!objective && !objectiveFile) || !isGoalStatus(goal.status)) {
    return null;
  }

  const tokenBudget =
    typeof goal.tokenBudget === 'number' &&
    Number.isFinite(goal.tokenBudget) &&
    goal.tokenBudget > 0
      ? Math.floor(goal.tokenBudget)
      : null;

  return {
    id,
    objective: objective.slice(0, GOAL_OBJECTIVE_CHAR_LIMIT),
    objectiveFile,
    status: goal.status,
    tokenBudget,
    tokensUsed: asCount(goal.tokensUsed),
    tokensBaseline: asCount(goal.tokensBaseline),
    tokensCommitted: asCount(goal.tokensCommitted),
    turnsUsed: asCount(goal.turnsUsed),
    auditFailStreak: asCount(goal.auditFailStreak),
    statusReason:
      typeof goal.statusReason === 'string'
        ? goal.statusReason.slice(0, REASON_CHAR_LIMIT)
        : '',
    evaluationProviderID:
      typeof goal.evaluationProviderID === 'string'
        ? goal.evaluationProviderID
        : '',
    evaluationModelID:
      typeof goal.evaluationModelID === 'string' ? goal.evaluationModelID : '',
    lastAccountedMessageID:
      typeof goal.lastAccountedMessageID === 'string'
        ? goal.lastAccountedMessageID
        : '',
    createdAt: asCount(goal.createdAt),
    updatedAt: asCount(goal.updatedAt),
  };
}

/** Parse the goal out of a fully typed session metadata object. */
export function getSessionGoal(
  metadata: SessionMetadata | undefined | null,
): AeroGoalPayload | null {
  return parseGoal(metadata);
}
