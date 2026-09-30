'use client';

import { Button, Checkbox, cn, IconButton, Input, ProgressBar } from '@aero/ui';
import { Flag, Grip, LayoutColumns, LayoutList, Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useCallback, useRef, useState } from 'react';

import { TaskBoard } from '@/app/components/chat-aside/notes/board-tab';
import {
  type SendTodoTarget,
  useSendTodoToAgent,
} from '@/app/components/chat-aside/notes/send-todo';
import { TaskActionsMenu } from '@/app/components/chat-aside/notes/task-actions';
import { PRIORITY_FLAG_CLASS } from '@/app/components/chat-aside/notes/task-meta';
import { useSaveProjectTodos } from '@/app/hooks/api/project-context';
import { useI18n } from '@/app/hooks/i18n';
import { useOptionalSessionId } from '@/app/providers/SessionIdProvider';
import type {
  AeroProjectTodo,
  AeroProjectTodoPriority,
} from '@/server/services/harness/types';

type TaskView = 'list' | 'board';
type DropPosition = 'before' | 'after';

/**
 * Tasks section of the project notes panel. The list is the fast capture/
 * reorder view; the board is the same data laid out by status.
 */
export function TasksTab({
  workspaceId,
  workspaceDirectory,
  todos,
}: {
  workspaceId: string;
  workspaceDirectory: string;
  todos: AeroProjectTodo[];
}) {
  const { t } = useI18n();
  const sessionId = useOptionalSessionId();
  const sendTodo = useSendTodoToAgent();
  const [view, setView] = useState<TaskView>('list');

  const canSendToCurrent = Boolean(sessionId);
  const handleSend = useCallback(
    (target: SendTodoTarget, text: string) =>
      sendTodo({ text, target, sessionId, workspaceDirectory }),
    [sendTodo, sessionId, workspaceDirectory],
  );

  const doneCount = todos.filter((todo) => todo.status === 'done').length;
  const percent = todos.length
    ? Math.round((doneCount / todos.length) * 100)
    : 0;
  const progressLabel = t.notesPanel.tasks.progress(doneCount, todos.length);

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <div className='border-separator flex shrink-0 items-center gap-2 border-b px-2 py-1.5'>
        <TaskViewToggle value={view} onChange={setView} />

        {todos.length > 0 && (
          <div className='ml-auto flex min-w-0 items-center gap-2'>
            <span className='text-muted shrink-0 text-[11px] tabular-nums'>
              {progressLabel}
            </span>
            <ProgressBar
              aria-label={progressLabel}
              value={percent}
              color='success'
              size='sm'
              className='w-14 shrink-0'
            >
              <ProgressBar.Track>
                <ProgressBar.Fill />
              </ProgressBar.Track>
            </ProgressBar>
          </div>
        )}
      </div>

      <div className='min-h-0 flex-1 overflow-hidden'>
        {view === 'list' ? (
          <TaskList
            workspaceId={workspaceId}
            todos={todos}
            canSendToCurrent={canSendToCurrent}
            onSend={handleSend}
          />
        ) : (
          <TaskBoard
            workspaceId={workspaceId}
            todos={todos}
            canSendToCurrent={canSendToCurrent}
            onSend={handleSend}
          />
        )}
      </div>
    </div>
  );
}

function TaskViewToggle({
  value,
  onChange,
}: {
  value: TaskView;
  onChange: (view: TaskView) => void;
}) {
  const { t } = useI18n();
  const options = [
    { id: 'list', icon: LayoutList, label: t.notesPanel.tasks.viewList },
    { id: 'board', icon: LayoutColumns, label: t.notesPanel.tasks.viewBoard },
  ] as const;

  return (
    <div
      role='group'
      aria-label={t.notesPanel.tasks.viewAria}
      className='bg-default flex items-center gap-0.5 rounded-lg p-0.5'
    >
      {options.map((option) => {
        const isActive = option.id === value;
        return (
          <button
            key={option.id}
            type='button'
            aria-pressed={isActive}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.id)}
            className={cn(
              'focus-visible:ring-accent flex size-6 items-center justify-center rounded-md outline-none transition-colors duration-150 ease-out focus-visible:ring-2',
              isActive
                ? 'bg-overlay text-foreground'
                : 'text-muted hover:text-foreground',
            )}
          >
            <Icon data={option.icon} size={14} />
          </button>
        );
      })}
    </div>
  );
}

function TaskList({
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
  const { t } = useI18n();
  const save = useSaveProjectTodos(workspaceId);

  const [draft, setDraft] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: DropPosition;
  } | null>(null);
  // Anchor for shift + click range toggling of the done checkbox.
  const lastToggledIdRef = useRef<string | null>(null);

  const update = (next: AeroProjectTodo[]) => save.mutate(next);

  const addTodo = () => {
    const text = draft.trim();
    if (!text) return;

    update([
      ...todos,
      {
        id: crypto.randomUUID(),
        text,
        status: 'backlog',
        priority: 'medium',
        createdAt: Date.now(),
      },
    ]);
    setDraft('');
  };

  const toggleTodo = (id: string, done: boolean, shift: boolean) => {
    const anchor = lastToggledIdRef.current;
    const from = shift && anchor ? todos.findIndex((t) => t.id === anchor) : -1;
    const to = todos.findIndex((t) => t.id === id);

    // Shift + click applies the clicked checkbox's new state to every task
    // between the anchor and it (mirrors the sidebar's range selection).
    if (from !== -1 && to !== -1) {
      const [start, end] = from < to ? [from, to] : [to, from];
      const range = new Set(todos.slice(start, end + 1).map((t) => t.id));
      update(
        todos.map((todo) =>
          range.has(todo.id)
            ? { ...todo, status: done ? 'done' : 'backlog' }
            : todo,
        ),
      );
      lastToggledIdRef.current = id;
      return;
    }

    lastToggledIdRef.current = id;
    update(
      todos.map((todo) =>
        todo.id === id ? { ...todo, status: done ? 'done' : 'backlog' } : todo,
      ),
    );
  };

  const setPriority = (id: string, priority: AeroProjectTodoPriority) => {
    update(
      todos.map((todo) => (todo.id === id ? { ...todo, priority } : todo)),
    );
  };

  const deleteTodo = (id: string) => {
    update(todos.filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    update(todos.filter((todo) => todo.status !== 'done'));
  };

  const reorder = (fromId: string, toId: string, position: DropPosition) => {
    const moving = todos.find((todo) => todo.id === fromId);
    if (!moving || fromId === toId) return;

    const without = todos.filter((todo) => todo.id !== fromId);
    let index = without.findIndex((todo) => todo.id === toId);
    if (index === -1) return;
    if (position === 'after') index += 1;

    without.splice(index, 0, moving);
    update(without);
  };

  const doneCount = todos.filter((todo) => todo.status === 'done').length;

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <form
        className='border-separator flex shrink-0 items-center gap-1.5 border-b px-2 py-2'
        onSubmit={(event) => {
          event.preventDefault();
          addTodo();
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t.notesPanel.tasks.addPlaceholder}
          aria-label={t.notesPanel.tasks.addPlaceholder}
          className='h-7 flex-1 rounded-lg text-sm'
        />
        <IconButton
          type='submit'
          aria-label={t.notesPanel.tasks.add}
          isDisabled={!draft.trim()}
        >
          <Icon data={Plus} />
        </IconButton>
      </form>

      <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1.5'>
        {todos.length === 0 ? (
          <div className='text-muted flex h-full items-center justify-center px-4 text-center text-sm'>
            {t.notesPanel.tasks.empty}
          </div>
        ) : (
          todos.map((todo) => (
            <TaskRow
              key={todo.id}
              todo={todo}
              canSendToCurrent={canSendToCurrent}
              dragging={draggingId === todo.id}
              dropIndicator={
                dropTarget?.id === todo.id ? dropTarget.position : null
              }
              onToggle={toggleTodo}
              onSetPriority={setPriority}
              onDelete={deleteTodo}
              onSend={(target) => onSend(target, todo.text)}
              onDragStart={setDraggingId}
              onDragEnd={() => {
                setDraggingId(null);
                setDropTarget(null);
              }}
              onDragOver={(position) =>
                setDropTarget({ id: todo.id, position })
              }
              onDrop={(position) => {
                if (draggingId && draggingId !== todo.id) {
                  reorder(draggingId, todo.id, position);
                }
                setDraggingId(null);
                setDropTarget(null);
              }}
            />
          ))
        )}
      </div>

      {doneCount > 0 && (
        <div className='border-separator flex shrink-0 items-center justify-end border-t px-3 py-1.5'>
          <Button
            size='sm'
            variant='ghost'
            onPress={clearCompleted}
            className='h-7 rounded-lg text-xs'
          >
            {t.notesPanel.tasks.clearCompleted}
          </Button>
        </div>
      )}
    </div>
  );
}

function TaskRow({
  todo,
  canSendToCurrent,
  dragging,
  dropIndicator,
  onToggle,
  onSetPriority,
  onDelete,
  onSend,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
}: {
  todo: AeroProjectTodo;
  canSendToCurrent: boolean;
  dragging: boolean;
  dropIndicator: DropPosition | null;
  onToggle: (id: string, done: boolean, shift: boolean) => void;
  onSetPriority: (id: string, priority: AeroProjectTodoPriority) => void;
  onDelete: (id: string) => void;
  onSend: (target: SendTodoTarget) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (position: DropPosition) => void;
  onDrop: (position: DropPosition) => void;
}) {
  const { t } = useI18n();
  const done = todo.status === 'done';
  const isShiftPressedRef = useRef(false);

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-lg py-1 px-0.5',
        dragging && 'opacity-40',
      )}
      onDragOver={(event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';

        const rect = event.currentTarget.getBoundingClientRect();
        onDragOver(
          event.clientY < rect.top + rect.height / 2 ? 'before' : 'after',
        );
      }}
      onDrop={(event) => {
        event.preventDefault();
        onDrop(dropIndicator ?? 'after');
      }}
    >
      {dropIndicator === 'before' && (
        <div className='bg-accent pointer-events-none absolute inset-x-2 -top-px h-0.5 rounded-full' />
      )}
      {dropIndicator === 'after' && (
        <div className='bg-accent pointer-events-none absolute inset-x-2 -bottom-px h-0.5 rounded-full' />
      )}

      <div
        role='button'
        tabIndex={0}
        aria-label={t.notesPanel.tasks.dragHandle}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', todo.id);
          onDragStart(todo.id);
        }}
        onDragEnd={onDragEnd}
        onClick={(event) => event.stopPropagation()}
        className='text-muted shrink-0 cursor-grab rounded p-0.5 active:cursor-grabbing'
      >
        <Icon data={Grip} size={14} />
      </div>

      <div
        className='contents'
        onPointerDownCapture={(event) => {
          isShiftPressedRef.current = event.shiftKey;
          if (event.shiftKey) event.preventDefault();
        }}
        onClick={(event) => event.stopPropagation()}
      >
        <Checkbox
          variant='secondary'
          isSelected={done}
          onChange={(isSelected) => {
            const shift = isShiftPressedRef.current;
            isShiftPressedRef.current = false;
            onToggle(todo.id, isSelected, shift);
          }}
          aria-label={todo.text}
        >
          <Checkbox.Content>
            <Checkbox.Control>
              <Checkbox.Indicator />
            </Checkbox.Control>
          </Checkbox.Content>
        </Checkbox>
      </div>

      <span
        aria-hidden
        title={t.notesPanel.tasks.priorities[todo.priority]}
        className={cn(
          'shrink-0',
          PRIORITY_FLAG_CLASS[todo.priority],
          done && 'opacity-50',
        )}
      >
        <Icon data={Flag} size={12} />
      </span>

      <span
        className={cn(
          'min-w-0 flex-1 text-sm break-words',
          done ? 'text-muted line-through' : 'text-foreground',
        )}
      >
        {todo.text}
      </span>

      <div className='contents' onClick={(event) => event.stopPropagation()}>
        <TaskActionsMenu
          todo={todo}
          canSendToCurrent={canSendToCurrent}
          triggerClassName=''
          onSetPriority={(priority) => onSetPriority(todo.id, priority)}
          onSend={onSend}
          onDelete={() => onDelete(todo.id)}
        />
      </div>
    </div>
  );
}
