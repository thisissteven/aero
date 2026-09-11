import { CircleCheck, CircleStop, ListCheck } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useParams } from '@tanstack/react-router';

import { cn, Typography } from '@aero/ui';

import { useSessionTodos } from '@/app/hooks/api/sessions';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function TaskStatus() {
  const { sessionId } = useParams({ strict: false });

  const isVisible = useStatusPanelStore((state) => state.visibleItems.task);

  if (!isVisible || !sessionId) return null;

  return <TaskStatusContent sessionId={sessionId} />;
}

export function TaskStatusContent({ sessionId }: { sessionId: string }) {
  const { data: todos } = useSessionTodos(undefined, sessionId);

  if (!todos || todos.length === 0) {
    return null;
  }

  const completedCount = todos.filter(
    (todo) => todo.status === 'completed',
  ).length;

  return (
    <div className='border-separator dark:border-separator/50 border-b py-3'>
      {/* Title Header */}
      <div className='mb-2.5 flex items-center justify-between px-3'>
        <div className='flex items-center gap-1'>
          <Icon data={ListCheck} className='text-muted' size={14} />
          <Typography type='body-sm' className='text-foreground font-medium'>
            Tasks
          </Typography>
        </div>
        <Typography type='body-xs' className='text-muted font-mono'>
          {completedCount}/{todos.length}
        </Typography>
      </div>

      {/* Task List */}
      <div className='flex flex-col gap-1.5 px-3'>
        {todos.map((todo, index) => {
          return (
            <div
              key={todo.content ?? index}
              className='flex items-start justify-between gap-2'
            >
              <div className='flex items-start gap-2 overflow-hidden'>
                <div
                  className={cn(
                    'mt-1.5 size-2 shrink-0 rounded-full',
                    todo.priority === 'high' && 'bg-danger',
                    todo.priority === 'medium' && 'bg-warning',
                    todo.priority === 'low' && 'bg-success',
                  )}
                />
                <Typography
                  type='body-xs'
                  className={cn(
                    'truncate',
                    todo.status === 'completed'
                      ? 'text-muted line-through'
                      : 'text-foreground/90',
                  )}
                >
                  {todo.content}
                </Typography>
              </div>

              <div className='shrink-0 pt-0.5'>
                {todo.status === 'completed' && (
                  <Icon data={CircleCheck} size={13} className='text-success' />
                )}
                {todo.status === 'in_progress' && (
                  <Icon data={CircleStop} size={13} className='text-accent' />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
