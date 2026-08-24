import { ChevronDown, CircleCheck, CircleStop, Clock } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useParams } from '@tanstack/react-router';
import { useState } from 'react';

import { cn, Popover } from '@aero/ui';

import { useSessionTodos } from '@/app/hooks/api/sessions';

export function SessionTodos() {
  const { sessionId } = useParams({ strict: false });
  const { data: todos } = useSessionTodos(undefined, sessionId);

  const [isOpen, setIsOpen] = useState(false);

  if (!todos || todos.length === 0) return null;

  const inProgress = todos.filter((todo) => todo.status === 'in_progress');

  const remaining =
    todos.length - todos.filter((todo) => todo.status === 'completed').length;

  const tasksCompleted = remaining === 0;

  if (tasksCompleted) {
    return (
      <div className='mx-2 mb-2 ml-auto flex max-w-sm items-center justify-end gap-1 text-sm'>
        <span className='pointer-events-none inline-block max-w-[180px] truncate align-middle max-md:hidden'>
          All tasks completed
        </span>
        <Icon data={CircleCheck} size={12} className='text-success' />
      </div>
    );
  }

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger className='focus-visible:ring-accent mx-2 mb-2 ml-auto flex max-w-sm items-center justify-end gap-1 text-sm focus-visible:ring-2 focus-visible:outline-none'>
        <span className='pointer-events-none inline-block max-w-[180px] truncate align-middle max-md:hidden'>
          {inProgress.length > 0
            ? inProgress[0].content
            : todos[todos.length - 1].content}
        </span>
        <div className='text-foreground/80 flex items-center gap-1'>
          <Icon data={CircleStop} size={12} className='text-accent' />
          <span className='text-xs'>{inProgress.length}</span>
        </div>
        <div className='text-foreground/80 flex items-center gap-1'>
          <Icon data={Clock} size={12} />
          <span className='text-xs'>{remaining}</span>
        </div>
        <Icon
          data={ChevronDown}
          size={12}
          className={cn(
            'text-foreground/80 transition',
            isOpen && 'rotate-180',
          )}
        />
      </Popover.Trigger>
      <Popover.Content placement='top right' className='max-w-sm rounded-xl'>
        <Popover.Dialog className='p-0'>
          <Popover.Heading className='p-3'>
            Tasks {todos.length - remaining}/{todos.length}
          </Popover.Heading>

          <div className='pl-1'>
            <ol className='max-h-[240px] scrollbar-thin space-y-1 overflow-y-auto pr-2 pb-3 pl-3'>
              {todos.map((todo, index) => {
                return (
                  <li
                    key={index}
                    className='flex items-center justify-between gap-2'
                  >
                    <div className='flex items-start gap-2'>
                      <div
                        className={cn(
                          'mt-1.5 size-2 shrink-0 rounded-full',
                          todo.priority === 'high' && 'bg-danger',
                          todo.priority === 'medium' && 'bg-warning',
                          todo.priority === 'low' && 'bg-success',
                        )}
                      ></div>
                      <span
                        className={cn(
                          todo.status === 'completed' &&
                            'text-muted line-through',
                        )}
                      >
                        {todo.content}
                      </span>
                    </div>
                    <div>
                      {todo.status === 'completed' && (
                        <Icon
                          data={CircleCheck}
                          size={14}
                          className='text-success'
                        />
                      )}
                      {todo.status === 'in_progress' && (
                        <Icon
                          data={CircleStop}
                          size={14}
                          className='text-accent'
                        />
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
