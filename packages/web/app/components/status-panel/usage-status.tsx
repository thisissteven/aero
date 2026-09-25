import { Typography } from '@aero/ui';
import { ArrowsRotateRight, Clock } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useI18n } from '@/app/hooks/i18n';

export function UsageStatus() {
  const { t } = useI18n();

  return (
    <div className='border-separator border-b p-3'>
      <div className='mb-2 flex cursor-pointer items-center justify-between'>
        <div className='flex items-center gap-1'>
          <Icon data={Clock} className='text-muted' size={14} />
          <Typography type='body-sm' className='text-foreground font-medium'>
            {t.settings.usage}
          </Typography>
        </div>
        <div className='text-muted flex items-center gap-1.5'>
          <span className='text-xs'>{t.statusPanel.used}</span>
          <ArrowsRotateRight className='hover:text-foreground h-3 w-3 cursor-pointer' />
        </div>
      </div>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <div className='bg-accent h-2 w-2 rounded-full' />
          <Typography type='body-sm' className='text-foreground font-medium'>
            {t.statusPanel.openRouter}
          </Typography>
        </div>
        <Typography type='body-xs' className='text-danger font-medium'>
          {t.statusPanel.fetchFailed}
        </Typography>
      </div>
    </div>
  );
}
