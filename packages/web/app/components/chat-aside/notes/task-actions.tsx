'use client';

import { cn, Dropdown, Label, Separator } from '@aero/ui';
import {
  CircleTree,
  EllipsisVertical,
  Flag,
  PaperPlane,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import type { SendTodoTarget } from '@/app/components/chat-aside/notes/send-todo';
import {
  PRIORITY_FLAG_CLASS,
  TODO_PRIORITIES,
} from '@/app/components/chat-aside/notes/task-meta';
import { useI18n } from '@/app/hooks/i18n';
import type {
  AeroProjectTodo,
  AeroProjectTodoPriority,
} from '@/server/services/harness/types';

const PRIORITY_PREFIX = 'priority:';

/**
 * The per-task menu shared by the list and board views: set priority, hand the
 * task to an agent session, or delete it. Drag handles the board's status, so
 * this menu never grows a "move" section.
 */
export function TaskActionsMenu({
  todo,
  canSendToCurrent,
  triggerClassName,
  onSetPriority,
  onSend,
  onDelete,
}: {
  todo: AeroProjectTodo;
  canSendToCurrent: boolean;
  triggerClassName?: string;
  onSetPriority: (priority: AeroProjectTodoPriority) => void;
  onSend: (target: SendTodoTarget) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();

  return (
    <Dropdown size='sm'>
      <Dropdown.Trigger
        aria-label={t.notesPanel.tasks.actions}
        className={cn(
          'h-7 w-7 shrink-0 rounded-md [&_svg]:!size-3.5 grid place-items-center text-muted hover:text-foreground/80 transition-colors',
          triggerClassName,
        )}
      >
        <Icon data={EllipsisVertical} />
      </Dropdown.Trigger>
      <Dropdown.Popover className='min-w-56' placement='bottom end'>
        <Dropdown.Menu
          onAction={(key) => {
            const action = String(key);
            if (action === 'delete') {
              onDelete();
              return;
            }
            if (action.startsWith(PRIORITY_PREFIX)) {
              onSetPriority(
                action.slice(PRIORITY_PREFIX.length) as AeroProjectTodoPriority,
              );
              return;
            }
            onSend(action as SendTodoTarget);
          }}
        >
          {TODO_PRIORITIES.map((priority) => {
            const isCurrent = todo.priority === priority;
            return (
              <Dropdown.Item
                id={`${PRIORITY_PREFIX}${priority}`}
                key={priority}
                textValue={t.notesPanel.tasks.priorities[priority]}
                isDisabled={isCurrent}
              >
                <Icon data={Flag} className={PRIORITY_FLAG_CLASS[priority]} />
                <Label
                  className={cn(isCurrent && 'text-foreground! font-medium')}
                >
                  {t.notesPanel.tasks.priorities[priority]}
                </Label>
              </Dropdown.Item>
            );
          })}

          <Separator className='my-0.5 h-[0.5px]' />

          <Dropdown.Item
            id='current'
            textValue={t.notesPanel.tasks.sendToCurrent}
            isDisabled={!canSendToCurrent}
          >
            <Icon data={PaperPlane} />
            <Label>{t.notesPanel.tasks.sendToCurrent}</Label>
          </Dropdown.Item>
          <Dropdown.Item id='new' textValue={t.notesPanel.tasks.sendToNew}>
            <Icon data={Plus} />
            <Label>{t.notesPanel.tasks.sendToNew}</Label>
          </Dropdown.Item>
          <Dropdown.Item
            id='worktree'
            textValue={t.notesPanel.tasks.sendToWorktree}
          >
            <Icon data={CircleTree} />
            <Label>{t.notesPanel.tasks.sendToWorktree}</Label>
          </Dropdown.Item>

          <Separator className='my-0.5 h-[0.5px]' />

          <Dropdown.Item
            id='delete'
            textValue={t.notesPanel.tasks.delete}
            variant='danger'
          >
            <Icon data={TrashBin} className='text-danger-soft-foreground' />
            <Label className='text-danger-soft-foreground! font-medium'>
              {t.notesPanel.tasks.delete}
            </Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
