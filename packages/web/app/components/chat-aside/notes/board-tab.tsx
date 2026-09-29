'use client';

import {
  cn,
  IconButton,
  Input,
  Kanban,
  type UseKanbanReturn,
  useKanban,
  useKanbanCardPlaceholder,
  useKanbanColumn,
} from '@aero/ui';
import {
  CircleCheck,
  CircleDashed,
  Clock,
  Flag,
  Plus,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useCallback, useEffect, useRef, useState } from 'react';

import type { SendTodoTarget } from '@/app/components/chat-aside/notes/send-todo';
import { TaskActionsMenu } from '@/app/components/chat-aside/notes/task-actions';
import {
  PRIORITY_FLAG_CLASS,
  TODO_COLUMNS,
} from '@/app/components/chat-aside/notes/task-meta';
import { useSaveProjectTodos } from '@/app/hooks/api/project-context';
import { useI18n } from '@/app/hooks/i18n';
import type {
  AeroProjectTodo,
  AeroProjectTodoPriority,
  AeroProjectTodoStatus,
} from '@/server/services/harness/types';

/**
 * Kanban view of the workspace's tasks. Columns mirror `status`, so dragging a
 * card is the same write as checking it off in the list view.
 */
export function TaskBoard({
  workspaceId,
  todos,
  canSendToCurrent,
  onSend,
}: {
  workspaceId: string;
  todos: AeroProjectTodo[];
  canSendToCurrent: boolean;
  onSend: (target: SendTodoTarget, text: string) => void;
}) {
  const save = useSaveProjectTodos(workspaceId);

  const getColumn = useCallback((todo: AeroProjectTodo) => todo.status, []);
  const setColumn = useCallback(
    (todo: AeroProjectTodo, status: string): AeroProjectTodo => ({
      ...todo,
      status: status as AeroProjectTodoStatus,
    }),
    [],
  );

  const kanban = useKanban<AeroProjectTodo>({
    initialItems: todos,
    getColumn,
    setColumn,
  });

  // `useKanban` owns its own list once mounted, so persist whenever it moves.
  // Keeping the last write in a ref (and comparing) avoids re-saving the seed
  // on mount and under React strict mode's double effect.
  const mutateRef = useRef(save.mutate);
  mutateRef.current = save.mutate;
  const lastWritten = useRef(JSON.stringify(todos));
  const items = kanban.list.items;

  useEffect(() => {
    const serialized = JSON.stringify(items);
    if (serialized === lastWritten.current) return;
    lastWritten.current = serialized;
    mutateRef.current(items);
  }, [items]);

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <Kanban size='sm' className='min-h-0 flex-1'>
        {TODO_COLUMNS.map((column) => (
          <BoardColumn
            key={column}
            column={column}
            kanban={kanban}
            canSendToCurrent={canSendToCurrent}
            onSend={onSend}
          />
        ))}
      </Kanban>
    </div>
  );
}

function BoardColumn({
  column,
  kanban,
  canSendToCurrent,
  onSend,
}: {
  column: AeroProjectTodoStatus;
  kanban: UseKanbanReturn<AeroProjectTodo>;
  canSendToCurrent: boolean;
  onSend: (target: SendTodoTarget, text: string) => void;
}) {
  const { t } = useI18n();
  const { renderDropIndicator } = useKanbanCardPlaceholder({
    renderIndicator: (target) => <Kanban.DropIndicator target={target} />,
  });
  const { dragAndDropHooks, items } = useKanbanColumn(kanban, column, {
    renderDropIndicator,
  });

  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    kanban.addItem({
      id: crypto.randomUUID(),
      text,
      status: column,
      priority: 'medium',
      createdAt: Date.now(),
    });
    setDraft('');
  };

  const setPriority = (
    todo: AeroProjectTodo,
    priority: AeroProjectTodoPriority,
  ) => kanban.updateItem(todo.id, { ...todo, priority });

  return (
    <Kanban.Column>
      <Kanban.ColumnHeader>
        <Kanban.ColumnIndicator>
          <ColumnIcon column={column} />
        </Kanban.ColumnIndicator>
        <Kanban.ColumnTitle>
          {t.notesPanel.board.columns[column]}
        </Kanban.ColumnTitle>
        <Kanban.ColumnCount>{items.length}</Kanban.ColumnCount>
        <Kanban.ColumnActions className='opacity-100'>
          <IconButton
            aria-label={t.notesPanel.tasks.add}
            onPress={() => setComposing(true)}
          >
            <Icon data={Plus} />
          </IconButton>
        </Kanban.ColumnActions>
      </Kanban.ColumnHeader>

      <Kanban.ColumnBody className='min-h-0'>
        <Kanban.ScrollShadow className='min-h-0 flex-1'>
          <Kanban.CardList
            aria-label={t.notesPanel.board.columns[column]}
            dragAndDropHooks={dragAndDropHooks}
            items={items}
            renderEmptyState={() => (
              <span>{t.notesPanel.board.emptyColumn}</span>
            )}
          >
            {(todo) => (
              <Kanban.Card
                key={todo.id}
                className='group'
                textValue={todo.text}
              >
                <div className='flex flex-col gap-2'>
                  <span
                    className={cn(
                      'text-left text-sm leading-snug break-words',
                      todo.status === 'done'
                        ? 'text-muted line-through'
                        : 'text-foreground',
                    )}
                  >
                    {todo.text}
                  </span>

                  <div className='flex items-center justify-between gap-2'>
                    <span
                      className={cn(
                        'inline-flex min-w-0 items-center gap-1 text-[11px] font-medium',
                        PRIORITY_FLAG_CLASS[todo.priority],
                      )}
                    >
                      <Icon data={Flag} size={11} className='shrink-0' />
                      <span className='truncate'>
                        {t.notesPanel.tasks.priorities[todo.priority]}
                      </span>
                    </span>

                    <TaskActionsMenu
                      todo={todo}
                      canSendToCurrent={canSendToCurrent}
                      triggerClassName='-mr-1 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
                      onSetPriority={(priority) => setPriority(todo, priority)}
                      onSend={(target) => onSend(target, todo.text)}
                      onDelete={() => kanban.removeItem(todo.id)}
                    />
                  </div>
                </div>
              </Kanban.Card>
            )}
          </Kanban.CardList>
        </Kanban.ScrollShadow>

        {composing && (
          <form
            className='flex shrink-0 items-center gap-1.5 px-2 pb-2'
            onSubmit={(event) => {
              event.preventDefault();
              submit();
            }}
          >
            <Input
              autoFocus
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              onBlur={() => {
                if (!draft.trim()) setComposing(false);
              }}
              onKeyDown={(event) => {
                if (event.key === 'Escape') {
                  setComposing(false);
                  setDraft('');
                }
              }}
              placeholder={t.notesPanel.board.addPlaceholder}
              aria-label={t.notesPanel.tasks.add}
              className='h-7 flex-1 rounded-lg text-sm'
            />
            <IconButton
              type='submit'
              color='accent'
              aria-label={t.notesPanel.tasks.add}
              isDisabled={!draft.trim()}
            >
              <Icon data={Plus} />
            </IconButton>
          </form>
        )}
      </Kanban.ColumnBody>
    </Kanban.Column>
  );
}

function ColumnIcon({ column }: { column: AeroProjectTodoStatus }) {
  if (column === 'done') {
    return <Icon data={CircleCheck} size={14} className='text-success' />;
  }
  if (column === 'active') {
    return <Icon data={Clock} size={14} className='text-warning' />;
  }
  return <Icon data={CircleDashed} size={14} className='text-muted' />;
}
