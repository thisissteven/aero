import { Typography } from '@aero/ui';
import { LayoutCells } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import {
  ActivitySummaryContent,
  ActivitySummarySkeleton,
} from '@/app/components/activity/activity-summary-content';
import { useActivitySummary } from '@/app/hooks/api/activity';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function ActivityStatus() {
  const isVisible = useStatusPanelStore((state) => state.visibleItems.activity);
  const directory = useSessionDirectory();
  const { data, isPending } = useActivitySummary(directory);
  const { t } = useI18n();

  if (!isVisible) return null;

  return (
    <div className='border-separator border-b p-3'>
      <div className='mb-2.5 flex items-center gap-1'>
        <Icon data={LayoutCells} className='text-muted' size={14} />
        <Typography type='body-sm' className='text-foreground font-medium'>
          {t.statusPanel.activity}
        </Typography>
      </div>

      {isPending && !data ? (
        <ActivitySummarySkeleton />
      ) : data ? (
        <ActivitySummaryContent
          range='year'
          showWorkspaces={false}
          summary={data}
        />
      ) : null}
    </div>
  );
}
