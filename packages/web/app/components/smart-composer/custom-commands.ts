import { AeroCommandCompact } from '@/server/services/harness/types';

const commandNames = [
  'undo',
  'redo',
  'timeline',
  'compact',
  'btw',
  'summary',
  'workspace-review',
  'handoff-review',
  'plan-feature',
  'craft-goal',
  'schedule-task',
  'catch-up',
  'debug',
  'weigh',
  'explore',
] as const;

export type AeroCommandName = (typeof commandNames)[number];

const descriptions: Record<AeroCommandName, string> = {
  undo: 'Undo the last message',
  redo: 'Redo previously undone messages',
  timeline: 'Open the conversation timeline',
  compact: 'Compress session history using AI to reduce context size',
  btw: 'Ask a side question in a temporary child session without derailing this chat.',
  summary:
    'Non-destructive session summary. Optional topic hint after the command.',
  'workspace-review':
    'Review the workspace diff for intent, correctness, and adequacy, graded by severity.',
  'handoff-review':
    'Create or reuse a separate review session from a generated handoff.',
  'plan-feature':
    'Start a guided, back-and-forth planning session for a new feature.',
  'craft-goal': 'Turn an idea or task into a clear, verifiable Goal.',
  'schedule-task': 'Define a scheduled task through a guided dialogue.',
  'catch-up': 'Re-establish context: what you were doing and where to pick up.',
  debug: 'Guided root-cause investigation for a bug before proposing a fix.',
  weigh:
    'Weigh 2-3 approaches with trade-offs and a recommendation before you commit.',
  explore:
    'Get oriented in this codebase: a high-level tour of the architecture and main parts.',
};

const hints: Record<AeroCommandName, Array<string>> = {
  undo: ['undo message', 'revert', 'rollback'],
  redo: ['redo message', 'reapply'],
  timeline: ['chronology', 'session history', 'what happened'],
  compact: ['compress history', 'reduce tokens', 'summarize context'],
  btw: ['aside', 'side note', 'by the way'],
  summary: ['recap', 'status', 'topic hint'],
  'workspace-review': ['review diff', 'severity', 'intent'],
  'handoff-review': ['handoff', 'delegate review', 'review session'],
  'plan-feature': ['feature plan', 'guided planning', 'design'],
  'craft-goal': ['goal statement', 'verifiable goal', 'success criteria'],
  'schedule-task': ['scheduled task', 'guided dialogue', 'dependencies'],
  'catch-up': ['context', 'where to pick up', 'status update'],
  debug: ['root cause', 'reproduce', 'fix bug'],
  weigh: ['trade-offs', 'options', 'recommendation'],
  explore: ['architecture', 'codebase tour', 'findings'],
};

export const customCommands: Array<AeroCommandCompact> = commandNames.map(
  (name): AeroCommandCompact => ({
    name,
    description: descriptions[name],
    source: 'aero',
    hints: hints[name],
  }),
);

const templates: Record<AeroCommandName, string> = {
  undo: 'Undo the last message. Explain what was reverted and confirm the resulting state.',
  redo: 'Redo the previously undone message(s). Explain what was reapplied and confirm the resulting state.',
  timeline:
    'Open the conversation timeline and summarize the sequence of actions taken so far in chronological order.',
  compact:
    'Compress this session history using AI to reduce context size. Preserve key decisions, open questions, and next steps.',
  btw: 'Aside (temporary child session, not part of the main task): {{input}}',
  summary:
    'Provide a non-destructive summary of the session so far, including what changed, why, and what remains. Optional topic hint: {{input}}',
  'workspace-review':
    'Review the workspace diff for intent, correctness, and adequacy. Grade findings by severity and suggest cleanup or follow-ups.',
  'handoff-review':
    'Create or reuse a separate review session from a generated handoff. Summarize what should be reviewed and by whom.',
  'plan-feature':
    'Start a guided, back-and-forth planning session for a new feature. Ask clarifying questions, then produce a step-by-step implementation plan.',
  'craft-goal':
    'Turn the following idea or task into a clear, verifiable Goal: {{input}}. Include success criteria and constraints.',
  'schedule-task':
    'Define a scheduled task through a guided dialogue for: {{input}}. Cover ordering, dependencies, and rough estimates.',
  'catch-up':
    'Re-establish context: summarize what I was doing and where to pick up, including decisions and blockers.',
  debug:
    'Guided root-cause investigation for a bug before proposing a fix. Reproduce, isolate, identify root cause, then propose the fix.',
  weigh:
    'Weigh 2-3 approaches for: {{input}}. Present trade-offs, a recommendation, and rationale before I commit.',
  explore:
    'Get oriented in this codebase: a high-level tour of the architecture and main parts. Focus area: {{input}}.',
};

export const commandTemplates = templates;
