'use client';

import { Skeleton } from '@aero/ui';
import { File } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import { NotesTab } from '@/app/components/chat-aside/notes/notes-tab';
import { PlansTab } from '@/app/components/chat-aside/notes/plans-tab';
import { QueueTab } from '@/app/components/chat-aside/notes/queue-tab';
import { TasksTab } from '@/app/components/chat-aside/notes/tasks-tab';
import { SectionTabs } from '@/app/components/chat-aside/pr/shared';
import { useProjectContext } from '@/app/hooks/api/project-context';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useWorkspace } from '@/app/hooks/api/workspaces';
import { useI18n } from '@/app/hooks/i18n';

type NotesSection = 'notes' | 'tasks' | 'queue' | 'plans';

/**
 * Per-workspace scratch space: rich-text notes, a task list with a kanban
 * board, a message queue, and saved plans. The workspace is resolved from the
 * active session's directory so every worktree session shares the same context
 * as its parent project.
 */
export function ProjectNotesPanel() {
  const { t } = useI18n();
  const directory = useSessionDirectory();
  const { data: workspace, isLoading: isWorkspaceLoading } = useWorkspace(
    directory ?? '',
  );
  const workspaceId = workspace?.id;
  const { data: context, isLoading: isContextLoading } =
    useProjectContext(workspaceId);
  const [section, setSection] = useState<NotesSection>('notes');

  if (!directory) {
    return <NotesEmptyState message={t.notesPanel.openWorkspace} />;
  }

  if (isWorkspaceLoading || (workspaceId && isContextLoading)) {
    return (
      <div className='space-y-2 p-3'>
        <Skeleton className='h-8 w-full rounded' />
        <Skeleton className='h-7 w-3/4 rounded' />
        <Skeleton className='h-7 w-1/2 rounded' />
        <Skeleton className='h-40 w-full rounded' />
      </div>
    );
  }

  if (!workspaceId || !context) {
    return <NotesEmptyState message={t.notesPanel.openWorkspace} />;
  }

  return (
    <div className='flex h-full min-h-0 flex-col overflow-hidden'>
      <SectionTabs<NotesSection>
        ariaLabel={t.notesPanel.tabsAria}
        active={section}
        onChange={setSection}
        tabs={[
          {
            id: 'notes',
            label: t.notesPanel.tabNotes,
            count: context.notes.length,
          },
          {
            id: 'tasks',
            label: t.notesPanel.tabTasks,
            count: context.todos.length,
          },
          {
            id: 'queue',
            label: t.notesPanel.tabQueue,
            count: context.queue.length,
          },
          {
            id: 'plans',
            label: t.notesPanel.tabPlans,
            count: context.plans.length,
          },
        ]}
      />

      <div className='min-h-0 flex-1 overflow-hidden'>
        {section === 'notes' ? (
          <NotesTab
            key={workspaceId}
            workspaceId={workspaceId}
            notes={context.notes}
          />
        ) : section === 'tasks' ? (
          <TasksTab
            key={workspaceId}
            workspaceId={workspaceId}
            workspaceDirectory={workspace.directory}
            todos={context.todos}
          />
        ) : section === 'queue' ? (
          <QueueTab
            key={workspaceId}
            workspaceId={workspaceId}
            workspaceDirectory={workspace.directory}
            queue={context.queue}
          />
        ) : (
          <PlansTab
            key={workspaceId}
            workspaceId={workspaceId}
            plans={context.plans}
          />
        )}
      </div>
    </div>
  );
}

function NotesEmptyState({ message }: { message: string }) {
  return (
    <div className='text-muted flex h-full min-h-0 flex-col items-center justify-center gap-2 p-6 text-center'>
      <Icon data={File} size={20} className='text-muted' />
      <p className='max-w-64 text-sm'>{message}</p>
    </div>
  );
}
