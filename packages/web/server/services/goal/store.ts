// server/services/goal/store.ts
//
// Read/write helpers for the goal payload that lives under
// `session.metadata.aero.goal`, plus server-side goal creation.

import type { HarnessAdapter } from '@/server/services/harness/types';
import type { SessionMetadata } from '@/server/types/opencode-sdk';

import { writeObjective } from './objectives';
import {
  type AeroGoalPayload,
  GOAL_OBJECTIVE_CHAR_LIMIT,
  parseGoal,
} from './types';

const TRIM_MARKER =
  '\n\n[… objective trimmed for the auditor — the full prompt was delivered in the chat message …]\n\n';

/**
 * The synthetic first-turn reminder appended to the armed prompt telling the
 * agent goal mode is active and that each turn must end with a factual
 * done/verified/remaining report for the independent audit.
 */
export function buildGoalIntroText(tokenBudget: number | null): string {
  const budgetLine = tokenBudget
    ? ` A token budget of ${tokenBudget} tokens applies to this goal.`
    : '';
  return (
    '<system-reminder>\n' +
    'Goal mode is active for this session. The user message above defines the goal objective. ' +
    'Work toward it across turns; whenever you stop before the objective is verifiably complete, the system will automatically prompt you to continue. ' +
    'Progress is evaluated independently after each turn, so end every turn with a clear, factual statement of what is done, what was verified, and what remains.' +
    budgetLine +
    '\n</system-reminder>'
  );
}

/**
 * Any goal source can exceed the objective limit (huge plans, pasted specs,
 * long composer prompts). The working agent received the full text in chat;
 * only the AUDITOR is bound by the limit — so oversized objectives are trimmed
 * to a head+tail excerpt that keeps the intent (top) and the acceptance
 * criteria (bottom).
 */
function fitObjective(raw: string): string {
  if (raw.length <= GOAL_OBJECTIVE_CHAR_LIMIT) return raw;
  const half = Math.max(
    0,
    Math.floor((GOAL_OBJECTIVE_CHAR_LIMIT - TRIM_MARKER.length) / 2),
  );
  return `${raw.slice(0, half)}${TRIM_MARKER}${raw.slice(-half)}`;
}

const createGoalId = (): string =>
  `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;

export function readGoalFromMetadata(
  metadata: SessionMetadata | undefined | null,
): AeroGoalPayload | null {
  return parseGoal(metadata);
}

/**
 * Merge-write the goal payload from a FRESH session read so concurrent metadata
 * writes survive. Returns the written goal, or null when the stored goal no
 * longer matches the expected id (user replaced/cleared it while we worked).
 */
export async function writeGoal(
  harness: HarnessAdapter,
  sessionId: string,
  expectedGoalId: string,
  mutate: (current: AeroGoalPayload) => Partial<AeroGoalPayload>,
): Promise<AeroGoalPayload | null> {
  const session = await harness.getSession(sessionId);
  const metadata = (session.metadata ?? {}) as SessionMetadata;
  const current = parseGoal(metadata);
  if (!current || current.id !== expectedGoalId) return null;
  const next: AeroGoalPayload = {
    ...current,
    ...mutate(current),
    updatedAt: Date.now(),
  };
  await harness.updateSessionMetadata({
    sessionID: sessionId,
    metadata: {
      ...metadata,
      aero: { ...metadata.aero, goal: next },
    },
  });
  return next;
}

export interface CreateSessionGoalInput {
  harness: HarnessAdapter;
  sessionId: string;
  directory: string;
  objective: string;
  tokenBudget?: number | null;
}

/**
 * Create a fresh active goal from the prompt that is about to be dispatched.
 * The objective file is written BEFORE the metadata so the runtime can never
 * see a file-backed goal without its file; when the file write fails the
 * objective falls back to an inline copy.
 */
export async function createSessionGoal({
  harness,
  sessionId,
  directory,
  objective,
  tokenBudget,
}: CreateSessionGoalInput): Promise<AeroGoalPayload | null> {
  void directory;
  const raw = String(objective ?? '').trim();
  if (!raw) return null;

  const objectiveText = fitObjective(raw);

  let objectiveFile = false;
  try {
    await writeObjective(sessionId, objectiveText);
    objectiveFile = true;
  } catch {
    objectiveFile = false;
  }

  const now = Date.now();
  const goal: AeroGoalPayload = {
    id: createGoalId(),
    objective: objectiveFile
      ? ''
      : objectiveText.slice(0, GOAL_OBJECTIVE_CHAR_LIMIT),
    objectiveFile,
    status: 'active',
    tokenBudget:
      typeof tokenBudget === 'number' &&
      Number.isFinite(tokenBudget) &&
      tokenBudget > 0
        ? Math.floor(tokenBudget)
        : null,
    tokensUsed: 0,
    tokensBaseline: 0,
    tokensCommitted: 0,
    turnsUsed: 0,
    auditFailStreak: 0,
    statusReason: '',
    evaluationProviderID: '',
    evaluationModelID: '',
    lastAccountedMessageID: '',
    createdAt: now,
    updatedAt: now,
  };

  const session = await harness.getSession(sessionId);
  const metadata = (session.metadata ?? {}) as SessionMetadata;
  await harness.updateSessionMetadata({
    sessionID: sessionId,
    metadata: {
      ...metadata,
      aero: { ...metadata.aero, goal },
    },
  });

  return goal;
}

/** Remove the goal payload from session metadata, best-effort. */
export async function clearGoal(
  harness: HarnessAdapter,
  sessionId: string,
): Promise<void> {
  const session = await harness.getSession(sessionId);
  const metadata = (session.metadata ?? {}) as SessionMetadata;
  if (!metadata.aero?.goal) return;
  const nextAero = { ...metadata.aero };
  delete nextAero.goal;
  await harness.updateSessionMetadata({
    sessionID: sessionId,
    metadata: { ...metadata, aero: nextAero },
  });
}
