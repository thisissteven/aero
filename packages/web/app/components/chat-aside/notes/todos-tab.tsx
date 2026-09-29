'use client';

import {
  Button,
  Checkbox,
  cn,
  Dropdown,
  IconButton,
  Input,
  Label,
  Separator,
} from '@aero/ui';
import {
  ArrowUpFromSquare,
  CodeFork,
  EllipsisVertical,
  Grip,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useState } from 'react';

import {
  type SendTodoTarget,
  useSendTodoToAgent,
} from '@/app/components/chat-aside/notes/send-todo';
import { useSaveProjectTodos } from '@/app/hooks/api/project-context';
import { useI18n } from '@/app/hooks/i18n';
import { useOptionalSessionId } from '@/app/providers/SessionIdProvider';
import type { AeroProjectTodo } from '@/server/services/harness/types';

type DropPosition = 'before' | 'after';

export function TodosTab({
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
  const save = useSaveProjectTodos(workspaceId);
  const sendTodo = useSendTodoToAgent();

  const [draft, setDraft] = useState('');
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{
    id: string;
    position: DropPosition;
  } | null>(null);

  const update = (next: AeroProjectTodo[]) => save.mutate(next);

  const addTodo = () => {
    const text = draft.trim();
    if (!text) return;

    update([
      ...todos,
      {
        id: crypto.randomUUID(),
        text,
        completed: false,
        createdAt: Date.now(),
      },
    ]);
    setDraft('');
  };

  const toggleTodo = (id: string, completed: boolean) => {
    update(
      todos.map((todo) => (todo.id === id ? { ...todo, completed } : todo)),
    );
  };

  const deleteTodo = (id: string) => {
    update(todos.filter((todo) => todo.id !== id));
  };

  const clearCompleted = () => {
    update(todos.filter((todo) => !todo.completed));
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

  const completedCount = todos.filter((todo) => todo.completed).length;

  return (
    <div className='flex h-full min-h-0 flex-col'>
      <form
        className='border-separator flex shrink-0 items-center gap-1.5 border-b px-3 py-2'
        onSubmit={(event) => {
          event.preventDefault();
          addTodo();
        }}
      >
        <Input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder={t.notesPanel.todos.addPlaceholder}
          aria-label={t.notesPanel.todos.addPlaceholder}
          className='h-7 flex-1 rounded-md text-sm'
        />
        <IconButton
          type='submit'
          aria-label={t.notesPanel.todos.add}
          isDisabled={!draft.trim()}
          color='accent'
        >
          <Icon data={Plus} />
        </IconButton>
      </form>

      <div className='scrollbar-thin min-h-0 flex-1 overflow-y-auto p-1.5'>
        {todos.length === 0 ? (
          <div className='text-muted flex h-full items-center justify-center px-4 text-center text-sm'>
            {t.notesPanel.todos.empty}
          </div>
        ) : (
          todos.map((todo) => (
            <TodoRow
              key={todo.id}
              todo={todo}
              canSendToCurrent={Boolean(sessionId)}
              dragging={draggingId === todo.id}
              dropIndicator={
                dropTarget?.id === todo.id ? dropTarget.position : null
              }
              onToggle={toggleTodo}
              onDelete={deleteTodo}
              onSend={(target) =>
                sendTodo({
                  text: todo.text,
                  target,
                  sessionId,
                  workspaceDirectory,
                })
              }
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

      {completedCount > 0 && (
        <div className='border-separator flex shrink-0 items-center justify-end border-t px-3 py-1.5'>
          <Button
            size='sm'
            variant='ghost'
            onPress={clearCompleted}
            className='h-7 rounded-md text-xs'
          >
            {t.notesPanel.todos.clearCompleted}
          </Button>
        </div>
      )}
    </div>
  );
}

function TodoRow({
  todo,
  canSendToCurrent,
  dragging,
  dropIndicator,
  onToggle,
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
  onToggle: (id: string, completed: boolean) => void;
  onDelete: (id: string) => void;
  onSend: (target: SendTodoTarget) => void;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragOver: (position: DropPosition) => void;
  onDrop: (position: DropPosition) => void;
}) {
  const { t } = useI18n();

  return (
    <div
      className={cn(
        'group relative flex items-center gap-2 rounded-lg py-1 pr-1 pl-0.5',
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
        aria-label={t.notesPanel.todos.dragHandle}
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = 'move';
          event.dataTransfer.setData('text/plain', todo.id);
          onDragStart(todo.id);
        }}
        onDragEnd={onDragEnd}
        className='text-muted shrink-0 cursor-grab rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100 active:cursor-grabbing'
      >
        <Icon data={Grip} size={14} />
      </div>

      <Checkbox
        variant='secondary'
        isSelected={todo.completed}
        onChange={(isSelected) => onToggle(todo.id, isSelected)}
        aria-label={todo.text}
      >
        <Checkbox.Content>
          <Checkbox.Control>
            <Checkbox.Indicator />
          </Checkbox.Control>
        </Checkbox.Content>
      </Checkbox>

      <span
        className={cn(
          'min-w-0 flex-1 text-sm break-words',
          todo.completed ? 'text-muted line-through' : 'text-foreground',
        )}
      >
        {todo.text}
      </span>

      <Dropdown size='sm'>
        <Dropdown.Trigger
          aria-label={t.notesPanel.todos.actions}
          className='shrink-0 opacity-0 transition-opacity group-hover:opacity-100 focus-visible:opacity-100'
        >
          <Icon data={EllipsisVertical} />
        </Dropdown.Trigger>
        <Dropdown.Popover className='w-56' placement='bottom end'>
          <Dropdown.Menu
            onAction={(key) => {
              if (key === 'delete') {
                onDelete(todo.id);
                return;
              }
              onSend(key as SendTodoTarget);
            }}
          >
            <Dropdown.Item
              id='current'
              textValue={t.notesPanel.todos.sendToCurrent}
              isDisabled={!canSendToCurrent}
            >
              <Icon data={ArrowUpFromSquare} />
              <Label>{t.notesPanel.todos.sendToCurrent}</Label>
            </Dropdown.Item>
            <Dropdown.Item id='new' textValue={t.notesPanel.todos.sendToNew}>
              <Icon data={Plus} />
              <Label>{t.notesPanel.todos.sendToNew}</Label>
            </Dropdown.Item>
            <Dropdown.Item
              id='worktree'
              textValue={t.notesPanel.todos.sendToWorktree}
            >
              <Icon data={CodeFork} />
              <Label>{t.notesPanel.todos.sendToWorktree}</Label>
            </Dropdown.Item>
            <Separator className='my-0.5 h-[0.5px]' />
            <Dropdown.Item
              id='delete'
              textValue={t.notesPanel.todos.delete}
              variant='danger'
            >
              <Icon data={TrashBin} className='text-danger-soft-foreground' />
              <Label className='text-danger-soft-foreground! font-medium'>
                {t.notesPanel.todos.delete}
              </Label>
            </Dropdown.Item>
          </Dropdown.Menu>
        </Dropdown.Popover>
      </Dropdown>
    </div>
  );
}
