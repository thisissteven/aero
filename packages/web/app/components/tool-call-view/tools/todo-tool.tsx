import { ListCheck } from '@gravity-ui/icons';
import { memo, useMemo } from 'react';

import { BaseTool } from '@/app/components/tool-call-view/tools/base-tool';
import {
  TodoItem,
  TodoWritePart,
} from '@/app/components/tool-call-view/tools/tool-types';

export const TodoToolView = memo(
  ({
    part,
    blockId,
    isStreaming,
  }: {
    part: TodoWritePart;
    blockId: string;
    isStreaming: boolean;
  }) => {
    const todos: TodoItem[] = useMemo(() => {
      if (Array.isArray(part.metadata?.todos)) {
        return part.metadata.todos;
      }
      if (Array.isArray(part.input?.todos)) {
        return part.input.todos as TodoItem[];
      }
      return [];
    }, [part.metadata, part.input]);

    const stats = useMemo(() => {
      const total = todos.length;
      const inProgress = todos.filter((t) => t.status === 'in_progress');
      const pending = todos.filter((t) => t.status === 'pending');
      const completed = todos.filter((t) => t.status === 'completed');

      return { total, inProgress, pending, completed };
    }, [todos]);

    return (
      <BaseTool
        blockId={blockId}
        status={part.status}
        error={part.error}
        icon={ListCheck}
        title='Update Todo List'
        preview={`${stats.total} todos`}
        copyText={JSON.stringify(todos, null, 2)}
        isStreaming={isStreaming}
      >
        <div className='space-y-6 py-2 text-sm'>
          <div className='text-muted bg-surface/50 border-separator flex flex-wrap items-center gap-3 rounded-xl border p-3 text-xs'>
            <span>
              Total: <strong className='text-foreground'>{stats.total}</strong>
            </span>
            {stats.inProgress.length > 0 && (
              <span>
                In Progress:{' '}
                <strong className='text-accent'>
                  {stats.inProgress.length}
                </strong>
              </span>
            )}
            {stats.pending.length > 0 && (
              <span>
                Pending:{' '}
                <strong className='text-warning'>{stats.pending.length}</strong>
              </span>
            )}
            {stats.completed.length > 0 && (
              <span>
                Completed:{' '}
                <strong className='text-success'>
                  {stats.completed.length}
                </strong>
              </span>
            )}
          </div>

          {stats.inProgress.length > 0 && (
            <div className='space-y-2'>
              <div className='text-accent flex items-center gap-2 text-xs font-bold tracking-wider uppercase'>
                <span className='bg-accent size-2 rounded-full' />
                In Progress
              </div>
              <ul className='ml-1 space-y-1.5 pl-2'>
                {stats.inProgress.map((todo, idx) => (
                  <li
                    key={idx}
                    className='text-foreground flex items-center gap-2'
                  >
                    <span className='text-accent text-lg'>•</span>
                    <span>{todo.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stats.pending.length > 0 && (
            <div className='space-y-2'>
              <div className='text-warning flex items-center gap-2 text-xs font-bold tracking-wider uppercase'>
                <span className='bg-warning size-2 rounded-full' />
                Pending
              </div>
              <ul className='ml-1 space-y-1.5 pl-2'>
                {stats.pending.map((todo, idx) => (
                  <li
                    key={idx}
                    className='text-foreground flex items-center gap-2'
                  >
                    <span className='text-warning text-lg'>•</span>
                    <span>{todo.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {stats.completed.length > 0 && (
            <div className='space-y-2'>
              <div className='text-success flex items-center gap-2 text-xs font-bold tracking-wider uppercase'>
                <span className='bg-success size-2 rounded-full' />
                Completed
              </div>
              <ul className='ml-1 space-y-1.5 pl-2'>
                {stats.completed.map((todo, idx) => (
                  <li key={idx} className='text-muted flex items-center gap-2'>
                    <span className='text-success text-lg'>•</span>
                    <span className='line-through'>{todo.content}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </BaseTool>
    );
  },
);
