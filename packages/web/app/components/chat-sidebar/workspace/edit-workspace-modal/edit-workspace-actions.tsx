import { Button, Label } from '@aero/ui';
import { Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { InfoTooltip } from '@/app/providers/settings/general/components/info-tooltip';

export function EditWorkspaceActions() {
  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1.5 font-medium'>
          <Label>Actions</Label>

          <InfoTooltip>
            Custom automated workflows for this workspace
          </InfoTooltip>
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
