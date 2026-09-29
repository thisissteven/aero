import type {
  AeroProjectTodoPriority,
  AeroProjectTodoStatus,
} from '@/server/services/harness/types';

/** Board columns, in presentation order. */
export const TODO_COLUMNS: readonly AeroProjectTodoStatus[] = [
  'backlog',
  'active',
  'done',
];

/** Priority options, from least to most urgent. */
export const TODO_PRIORITIES: readonly AeroProjectTodoPriority[] = [
  'low',
  'medium',
  'high',
];

/** Colored flag used to signal priority at a glance. */
export const PRIORITY_FLAG_CLASS: Record<AeroProjectTodoPriority, string> = {
  low: 'text-muted',
  medium: 'text-warning',
  high: 'text-danger',
};
