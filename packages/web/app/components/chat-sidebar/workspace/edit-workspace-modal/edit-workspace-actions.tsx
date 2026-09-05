import { CircleQuestion, Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import { Button, Label, Tooltip } from '@aero/ui';

export function EditWorkspaceActions() {
  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1.5 font-medium'>
          <Label>Actions</Label>
          <Tooltip>
            <Tooltip.Trigger>
              <Icon data={CircleQuestion} size={16} />
            </Tooltip.Trigger>
            <Tooltip.Content>
              Custom automated workflows for this workspace
            </Tooltip.Content>
          </Tooltip>
        </div>
        <Button size='sm' variant='secondary'>
          <Icon data={Plus} size={16} />
          <span>Add action</span>
        </Button>
      </div>
      <p>No actions configured yet.</p>
    </div>
  );
}
