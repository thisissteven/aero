import { Popover } from '@aero/ui';
import { Sliders } from '@gravity-ui/icons';
import { Checkbox } from '@heroui/react';
import { useMemo } from 'react';

import { resolveStatusPanelOrder } from '@/app/components/status-panel/status-sections';
import { useStatusPanelOrder } from '@/app/hooks/api/settings';
import { useI18n } from '@/app/hooks/i18n';
import {
  type StatusItemKey,
  useStatusPanelStore,
} from '@/app/stores/status-panel-store';

export function DisplayPopover() {
  const visibleItems = useStatusPanelStore((state) => state.visibleItems);
  const setItemVisibility = useStatusPanelStore(
    (state) => state.setItemVisibility,
  );
  const { order } = useStatusPanelOrder();
  const { t } = useI18n();

  const orderedKeys = useMemo(() => resolveStatusPanelOrder(order), [order]);

  const labelByKey: Record<StatusItemKey, string> = {
    project: t.statusPanel.projectStatus,
    subagent: t.statusPanel.subagentStatus,
    task: t.statusPanel.taskStatus,
    mcp: t.statusPanel.mcpStatus,
    pinnedMessage: t.statusPanel.pinnedMessages,
    contextSources: t.statusPanel.contextSources,
    activity: t.statusPanel.activity,
  };

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

          {orderedKeys.map((key) => (
            <Checkbox
              key={key}
              isSelected={visibleItems[key] ?? true}
              onChange={(isSelected) => setItemVisibility(key, isSelected)}
              variant='secondary'
            >
              <Checkbox.Content className='gap-2 text-sm'>
                <Checkbox.Control>
                  <Checkbox.Indicator />
                </Checkbox.Control>
                {labelByKey[key]}
              </Checkbox.Content>
            </Checkbox>
          ))}
        </Popover.Dialog>
      </Popover.Content>
    </Popover>
  );
}
