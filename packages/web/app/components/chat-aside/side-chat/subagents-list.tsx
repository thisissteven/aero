import { cn, Spinner } from '@aero/ui';
import { VList } from 'virtua';
import { SubagentStatusItem } from '@/app/components/status-panel/subagent-status-item';
import { useSessions } from '@/app/hooks/api/sessions';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { AeroSessionSummary } from '@/server/services/harness/types';

export function SubagentsList() {
  const sessionsQuery = useSessions({
    childSessionsOnly: true,
  });

  const {
    items: sessions,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteScroll<AeroSessionSummary>(sessionsQuery);

  return (
    <div className='overflow-hidden relative h-[calc(100svh-56px-48px)]'>
      <VList className='p-2 scrollbar-thin'>
        {sessions.map((session) => {
          return (
            <SubagentStatusItem
              key={session.id}
              session={session}
              status={undefined}
            />
          );
        })}

        {/* Sentinel element for infinite scroll */}
        {hasNextPage && (
          <div ref={loadMoreRef} className='h-9 shrink-0'>
            <div
              aria-hidden={!hasNextPage}
              className={cn(
                'flex items-center justify-center py-2 text-sm',
                isFetchingNextPage && 'opacity-100',
                !hasNextPage && 'h-0 py-0 opacity-0',
              )}
            >
              <Spinner className='text-muted size-4' />
            </div>
          </div>
        )}
      </VList>
    </div>
  );
}
