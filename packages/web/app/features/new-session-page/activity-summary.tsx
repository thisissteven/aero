import {
  ActivitySummaryContent,
  ActivitySummarySkeleton,
} from '@/app/components/activity/activity-summary-content';
import { useActivitySummary } from '@/app/hooks/api/activity';
import { useSessionDirectory } from '@/app/hooks/api/sessions';
import { useChatInputExpanded } from '@/app/hooks/api/settings';
import { useI18n } from '@/app/hooks/i18n';

export function ActivitySummaryCard() {
  const isChatInputExpanded = useChatInputExpanded();
  const directory = useSessionDirectory();
  const { t } = useI18n();
  const { data, isPending } = useActivitySummary(directory);

  if (isChatInputExpanded) return null;
  if (!isPending && !data) return null;

  return (
    <div className='@container w-full max-w-[720px]'>
      <div className='bg-surface border-separator rounded-xl border px-4 py-3.5'>
        <div className='mb-3 flex items-baseline justify-between gap-3'>
          <span className='text-sm font-medium'>{t.activity.title}</span>
          <span className='text-muted hidden truncate text-xs @sm:block'>
            {t.activity.subtitle}
          </span>
        </div>

        {data ? (
          <ActivitySummaryContent summary={data} />
        ) : (
          <ActivitySummarySkeleton />
        )}
      </div>
    </div>
  );
}
