import { BaseTranslation } from '@/app/hooks/i18n/locales/translations';
import { AeroCommandCompact } from '@/server/services/harness/types';

export const commandNames = [
  'undo',
  'redo',
  'timeline',
  'btw',
  'steer',
  'summary',
  'compact',
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

export function isCustomCommandName(str: string): str is AeroCommandName {
  return (commandNames as readonly string[]).includes(str);
}

export type AeroCommandName = (typeof commandNames)[number];

const hints: Record<AeroCommandName, Array<string>> = {
  undo: ['undo message', 'revert', 'rollback'],
  redo: ['redo message', 'reapply'],
  timeline: ['chronology', 'session history', 'what happened'],
  compact: ['compress history', 'reduce tokens', 'summarize context'],
  btw: ['aside', 'side note', 'by the way'],
  steer: ['mid-turn', 'interject', 'redirect', 'while responding'],
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

const commandDictKeys: Record<
  AeroCommandName,
  keyof BaseTranslation['commands']['description']
> = {
  undo: 'undo',
  redo: 'redo',
  timeline: 'timeline',
  btw: 'btw',
  steer: 'steer',
  summary: 'summary',
  compact: 'compact',
  'workspace-review': 'workspaceReview',
  'handoff-review': 'handoffReview',
  'plan-feature': 'planFeature',
  'craft-goal': 'craftGoal',
  'schedule-task': 'scheduleTask',
  'catch-up': 'catchUp',
  debug: 'debug',
  weigh: 'weigh',
  explore: 'explore',
};

export function getCustomCommands(
  t: BaseTranslation,
): Array<AeroCommandCompact> {
  return commandNames.map(
    (name): AeroCommandCompact => ({
      name,
      description: t.commands.description[commandDictKeys[name]],
      source: 'aero',
      hints: hints[name],
    }),
  );
}

const excludedCommandsList = [
  'undo',
  'redo',
  'btw',
  'summary',
  'compact',
  'timeline',
  'handoff-review',
];

export function getCustomCommandsNonSession(t: BaseTranslation) {
  return getCustomCommands(t).filter(
    (command) =>
      !excludedCommandsList.includes(command.name) && command.name !== 'steer',
  );
}

export function getExcludedCommands(t: BaseTranslation) {
  return getCustomCommands(t).filter(
    (command) =>
      excludedCommandsList.includes(command.name) && command.name !== 'steer',
  );
}

export function getSteerCommand(t: BaseTranslation) {
  return {
    name: 'steer',
    description: t.commands.description.steer,
    source: 'aero',
    hints: hints.steer,
  };
}

const templateDictKeys: Record<
  Exclude<AeroCommandName, 'steer'>,
  keyof BaseTranslation['commands']['template']
> = {
  undo: 'undo',
  redo: 'redo',
  timeline: 'timeline',
  compact: 'compact',
  btw: 'btw',
  summary: 'summary',
  'workspace-review': 'workspaceReview',
  'handoff-review': 'handoffReview',
  'plan-feature': 'planFeature',
  'craft-goal': 'craftGoal',
  'schedule-task': 'scheduleTask',
  'catch-up': 'catchUp',
  debug: 'debug',
  weigh: 'weigh',
  explore: 'explore',
};

export function getCommandTemplates(
  t: BaseTranslation,
): Record<Exclude<AeroCommandName, 'steer'>, string> {
  const templates = {} as Record<Exclude<AeroCommandName, 'steer'>, string>;
  for (const name of commandNames) {
    if (name === 'steer') continue;
    templates[name] = t.commands.template[templateDictKeys[name]];
  }
  return templates;
}
