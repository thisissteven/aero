import { ProgressBar, Typography } from '@aero/ui';
import { DisplayPopover } from '@/app/components/status-panel/display-popover';
import { useSessionContext } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { useSessionId } from '@/app/providers/SessionIdProvider';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

function ContextUsage() {
  const sessionId = useSessionId();
  const { t } = useI18n();

  const { data } = useSessionContext(undefined, sessionId);

  const percentage = data?.context?.usedPercentage.toFixed(1);

  return (
    <div className='mt-2'>
      <div className='mb-1.5 flex items-center justify-between'>
        <Typography type='body-xs' color='muted'>
          {t.statusPanel.context}
        </Typography>
        <Typography type='body-xs' className='text-muted'>
          {percentage}%
        </Typography>
      </div>

      <ProgressBar
        aria-label={t.statusPanel.contextUsageAria}
        className='w-full'
        minValue={0}
        maxValue={100}
        value={Math.min(100, Math.max(0, Number(percentage)))}
      >
        <ProgressBar.Track className='h-1.5 bg-accent/10 backdrop-blur-sm'>
          <ProgressBar.Fill />
        </ProgressBar.Track>
      </ProgressBar>
    </div>
  );
}

export function SessionStatus() {
  const { t } = useI18n();
  const isVisible = useStatusPanelStore((state) => state.visibleItems.session);

  return (
    <div className='border-separator border-b p-3'>
      <div className='flex items-center justify-between'>
        <div className='flex items-center gap-2'>
          <Typography type='body-sm' className='text-foreground font-medium'>
            {t.statusPanel.sessionStatus}
          </Typography>
        </div>
        <DisplayPopover />
      </div>

      {isVisible && <ContextUsage />}
    </div>
  );
}
