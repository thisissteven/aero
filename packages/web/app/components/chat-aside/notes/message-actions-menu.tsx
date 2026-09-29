'use client';

import { cn, Dropdown, Label, Separator } from '@aero/ui';
import {
  ArrowUpFromSquare,
  CodeFork,
  EllipsisVertical,
  Pencil,
  Plus,
  TrashBin,
} from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import type { SendTodoTarget } from '@/app/components/chat-aside/notes/send-todo';
import { useI18n } from '@/app/hooks/i18n';

/** Edit / dispatch / delete menu for a queued message. */
export function MessageActionsMenu({
  canSendToCurrent,
  triggerClassName,
  onEdit,
  onSend,
  onDelete,
}: {
  canSendToCurrent: boolean;
  triggerClassName?: string;
  onEdit: () => void;
  onSend: (target: SendTodoTarget) => void;
  onDelete: () => void;
}) {
  const { t } = useI18n();

  return (
    <Dropdown size='sm'>
      <Dropdown.Trigger
        aria-label={t.notesPanel.queue.actions}
        className={cn(
          'h-7 w-7 shrink-0 rounded-md [&_svg]:!size-3.5',
          triggerClassName,
        )}
      >
        <Icon data={EllipsisVertical} />
      </Dropdown.Trigger>
      <Dropdown.Popover className='w-56' placement='bottom end'>
        <Dropdown.Menu
          onAction={(key) => {
            const action = String(key);
            if (action === 'edit') {
              onEdit();
              return;
            }
            if (action === 'delete') {
              onDelete();
              return;
            }
            onSend(action as SendTodoTarget);
          }}
        >
          <Dropdown.Item id='edit' textValue={t.notesPanel.queue.edit}>
            <Icon data={Pencil} />
            <Label>{t.notesPanel.queue.edit}</Label>
          </Dropdown.Item>

          <Separator className='my-0.5 h-[0.5px]' />

          <Dropdown.Item
            id='current'
            textValue={t.notesPanel.tasks.sendToCurrent}
            isDisabled={!canSendToCurrent}
          >
            <Icon data={ArrowUpFromSquare} />
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
            <Icon data={CodeFork} />
            <Label>{t.notesPanel.tasks.sendToWorktree}</Label>
          </Dropdown.Item>

          <Separator className='my-0.5 h-[0.5px]' />

          <Dropdown.Item
            id='delete'
            textValue={t.notesPanel.queue.delete}
            variant='danger'
          >
            <Icon data={TrashBin} className='text-danger-soft-foreground' />
            <Label className='text-danger-soft-foreground! font-medium'>
              {t.notesPanel.queue.delete}
            </Label>
          </Dropdown.Item>
        </Dropdown.Menu>
      </Dropdown.Popover>
    </Dropdown>
  );
}
