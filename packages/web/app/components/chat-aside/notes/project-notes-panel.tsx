'use client';

import { Skeleton } from '@aero/ui';
import { File } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import { NotesTab } from '@/app/components/chat-aside/notes/notes-tab';
import { PlansTab } from '@/app/components/chat-aside/notes/plans-tab';
import { TodosTab } from '@/app/components/chat-aside/notes/todos-tab';
import { SectionTabs } from '@/app/components/chat-aside/pr/shared';
import { useProjectContext } from '@/app/hooks/api/project-context';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useWorkspace } from '@/app/hooks/api/workspaces';
import { useI18n } from '@/app/hooks/i18n';

type NotesSection = 'notes' | 'todos' | 'plans';

/**
 * Per-workspace scratch space: free-form notes, a todo list, and saved plans.
 * The workspace is resolved from the active session's directory so every
 * worktree session shares the same context as its parent project.
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
          { id: 'notes', label: t.notesPanel.tabNotes },
          {
            id: 'todos',
            label: t.notesPanel.tabTodos,
            count: context.todos.length,
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
        ) : section === 'todos' ? (
          <TodosTab
            key={workspaceId}
            workspaceId={workspaceId}
            workspaceDirectory={workspace.directory}
            todos={context.todos}
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
