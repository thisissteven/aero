import { Sliders } from '@gravity-ui/icons';
import { Checkbox } from '@heroui/react';

import { Popover } from '@aero/ui';

import {
  type StatusItemKey,
  useStatusPanelStore,
} from '@/app/stores/status-panel-store';

const STATUS_ITEMS: { key: StatusItemKey; label: string }[] = [
  { key: 'session', label: 'Session Status' },
  { key: 'project', label: 'Project Status' },
  // { key: 'usage', label: 'Usage Status' },
  { key: 'subagent', label: 'Subagent Status' },
  { key: 'task', label: 'Task Status' },
  { key: 'mcp', label: 'MCP Status' },
  { key: 'pinnedMessage', label: 'Pinned Messages' },
  { key: 'contextSources', label: 'Context Sources' },
];

export function DisplayPopover() {
  const visibleItems = useStatusPanelStore((state) => state.visibleItems);
  const toggleItemVisibility = useStatusPanelStore(
    (state) => state.toggleItemVisibility,
  );

  return (
    <Popover>
      <Popover.Trigger>
        <Sliders className='text-muted hover:text-foreground h-3.5 w-3.5 cursor-pointer transition' />
      </Popover.Trigger>
      <Popover.Content className='w-56 rounded-xl p-0' placement='bottom right'>
        <Popover.Dialog className='flex flex-col gap-2'>
          <p className='text-muted mb-1 text-xs font-semibold'>Display Items</p>

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
