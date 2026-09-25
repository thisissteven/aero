import { Popover } from '@aero/ui';
import { Sliders } from '@gravity-ui/icons';
import { Checkbox } from '@heroui/react';
import { useI18n } from '@/app/hooks/i18n';
import {
  type StatusItemKey,
  useStatusPanelStore,
} from '@/app/stores/status-panel-store';

export function DisplayPopover() {
  const visibleItems = useStatusPanelStore((state) => state.visibleItems);
  const toggleItemVisibility = useStatusPanelStore(
    (state) => state.toggleItemVisibility,
  );
  const { t } = useI18n();

  const STATUS_ITEMS: { key: StatusItemKey; label: string }[] = [
    { key: 'session', label: t.statusPanel.sessionStatus },
    { key: 'project', label: t.statusPanel.projectStatus },
    // { key: 'usage', label: 'Usage Status' },
    { key: 'subagent', label: t.statusPanel.subagentStatus },
    { key: 'task', label: t.statusPanel.taskStatus },
    { key: 'mcp', label: t.statusPanel.mcpStatus },
    { key: 'pinnedMessage', label: t.statusPanel.pinnedMessages },
    { key: 'contextSources', label: t.statusPanel.contextSources },
  ];

  return (
    <Popover>
      <Popover.Trigger>
        <Sliders className='text-muted hover:text-foreground h-3.5 w-3.5 cursor-pointer transition' />
      </Popover.Trigger>
      <Popover.Content className='w-56 rounded-xl p-0' placement='bottom right'>
        <Popover.Dialog className='flex flex-col gap-2'>
          <p className='text-muted mb-1 text-xs font-semibold'>
            {t.statusPanel.displayItems}
          </p>

          {STATUS_ITEMS.map(({ key, label }) => (
            <Checkbox
              key={key}
              isSelected={visibleItems[key] ?? true}
              onChange={() => toggleItemVisibility(key)}
              variant='secondary'
            >
              <Checkbox.Content className='gap-2 text-sm'>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                {label}
              </Checkbox.Content>
            </Checkbox>
          ))}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
