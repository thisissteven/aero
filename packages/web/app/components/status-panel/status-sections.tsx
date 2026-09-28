import type { ReactNode } from 'react';

import { ActivityStatus } from '@/app/components/status-panel/activity-status';
import { ContextSources } from '@/app/components/status-panel/context-sources';
import { McpStatus } from '@/app/components/status-panel/mcp-status';
import { PinnedMessageStatus } from '@/app/components/status-panel/pinned-message-status';
import { ProjectStatus } from '@/app/components/status-panel/project-status';
import { SubagentStatus } from '@/app/components/status-panel/subagent-status';
import { TaskStatus } from '@/app/components/status-panel/task-status';
import type { StatusItemKey } from '@/app/stores/status-panel-store';

export const STATUS_SECTION_KEYS: StatusItemKey[] = [
  'project',
  'subagent',
  'task',
  'mcp',
  'pinnedMessage',
  'contextSources',
  'activity',
];

export function resolveStatusPanelOrder(
  savedOrder: readonly string[] | undefined,
): StatusItemKey[] {
  const valid = new Set<string>(STATUS_SECTION_KEYS);
  const seen = new Set<string>();
  const order: StatusItemKey[] = [];

  for (const key of savedOrder ?? []) {
    if (valid.has(key) && !seen.has(key)) {
      seen.add(key);
      order.push(key as StatusItemKey);
    }
  }

  for (const key of STATUS_SECTION_KEYS) {
    if (!seen.has(key)) order.push(key);
  }

  return order;
}

export function renderStatusSection(key: StatusItemKey): ReactNode {
  switch (key) {
    case 'project':
      return <ProjectStatus />;
    case 'subagent':
      return <SubagentStatus />;
    case 'task':
      return <TaskStatus />;
    case 'mcp':
      return <McpStatus />;
    case 'pinnedMessage':
      return <PinnedMessageStatus />;
    case 'contextSources':
      return <ContextSources />;
    case 'activity':
      return <ActivityStatus />;
    default:
      return null;
  }
}
