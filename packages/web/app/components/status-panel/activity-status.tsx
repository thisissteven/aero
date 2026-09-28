import { Typography } from '@aero/ui';
import { LayoutCells } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';

import {
  ActivitySummaryContent,
  ActivitySummarySkeleton,
} from '@/app/components/activity/activity-summary-content';
import { StatusSectionHandle } from '@/app/components/status-panel/sortable-status-section';
import {
  isStandaloneWorkspace,
  useActivitySummary,
} from '@/app/hooks/api/activity';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useI18n } from '@/app/hooks/i18n';
import { useStatusPanelStore } from '@/app/stores/status-panel-store';

export function ActivityStatus() {
  const isVisible = useStatusPanelStore((state) => state.visibleItems.activity);
  const directory = useSessionDirectory();
  const { data, isPending } = useActivitySummary(directory);
  const { t } = useI18n();

  if (!isVisible || isStandaloneWorkspace(directory)) return null;
  if (data ? data.totalSessions === 0 : !isPending) return null;

  return (
    <div className='p-3'>
      <StatusSectionHandle>
        <div className='mb-2.5 flex items-center gap-1'>
          <Icon data={LayoutCells} className='text-muted' size={14} />
          <Typography type='body-sm' className='text-foreground font-medium'>
            {t.statusPanel.activity}
          </Typography>
        </div>
      </StatusSectionHandle>

      {data ? (
        <ActivitySummaryContent
          emphasizeStats={false}
          range='year'
          showWorkspaces={false}
          summary={data}
        />
      ) : (
        <ActivitySummarySkeleton />
      )}
    </div>
  );
}
