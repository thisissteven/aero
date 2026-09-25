import { Button, Label } from '@aero/ui';
import { Plus } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useI18n } from '@/app/hooks/i18n';
import { InfoTooltip } from '@/app/providers/settings/general/components/info-tooltip';

export function EditWorkspaceActions() {
  const { t } = useI18n();

  return (
    <div className='flex flex-col gap-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-1.5 font-medium'>
          <Label>{t.common.actions}</Label>

          <InfoTooltip>{t.editWorkspace.actionsDescription}</InfoTooltip>
        </div>
        <Button size='sm' variant='secondary' className='rounded-lg'>
          <Icon data={Plus} size={16} />
          <span>{t.editWorkspace.addAction}</span>
        </Button>
      </div>
      <p>{t.editWorkspace.noActionsConfigured}</p>
    </div>
  );
}
