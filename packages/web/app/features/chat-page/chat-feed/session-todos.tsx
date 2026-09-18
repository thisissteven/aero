import { cn, Popover } from '@aero/ui';
import { ChevronDown, CircleCheck, CircleStop, Clock } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { memo, useState } from 'react';

import { useSessionTodos } from '@/app/hooks/api/sessions';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export const SessionTodos = memo(function SessionTodos() {
  const sessionId = useSessionId();
  const { data: todos } = useSessionTodos(undefined, sessionId);

  const [isOpen, setIsOpen] = useState(false);

  const isChatInputExpanded = useChatInputExpanded();

  const isStatusPanelOpen = useStatusPanelStore((s) => s.isOpen);

  if (!todos || todos.length === 0 || isChatInputExpanded || isStatusPanelOpen)
    return null;

  const inProgress = todos.filter((todo) => todo.status === 'in_progress');

  const remaining =
    todos.length - todos.filter((todo) => todo.status === 'completed').length;

  const tasksCompleted = remaining === 0;

  if (tasksCompleted) {
    return (
      <div className='mb-2 p-2 w-fit flex items-center gap-1 text-sm rounded-xl border border-separator bg-surface-secondary/60'>
        <span className='pointer-events-none inline-block max-w-[180px] truncate align-middle'>
          All tasks completed
        </span>
        <Icon data={CircleCheck} size={12} className='text-success shrink-0' />
      </div>
    );
  }

  return (
    <Popover isOpen={isOpen} onOpenChange={setIsOpen}>
      <Popover.Trigger className='mb-2 focus-visible:ring-accent flex shrink-0 items-center gap-1 rounded-xl p-2 text-sm  focus-visible:ring-2 focus-visible:outline-none border border-separator bg-surface-secondary/60 w-fit'>
        <span className='pointer-events-none inline-block max-w-[180px] truncate align-middle'>
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
            'text-foreground/80 shrink-0 transition',
            isOpen && 'rotate-180',
          )}
        />
      </Popover.Trigger>
      <Popover.Content
        placement='top start'
        className='max-w-[calc(100vw-2rem)] rounded-xl md:max-w-sm'
        offset={8}
      >
        <Popover.Dialog className='p-0'>
          <Popover.Heading className='p-3'>
            Tasks {todos.length - remaining}/{todos.length}
          </Popover.Heading>

          <div className='pl-1'>
            <ol className='max-h-[240px] scrollbar-thin space-y-1 overflow-y-auto pr-3 pb-3 pl-3'>
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
});
