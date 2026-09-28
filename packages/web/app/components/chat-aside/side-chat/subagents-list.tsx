import { cn, Skeleton, Spinner } from '@aero/ui';
import { Folder } from '@gravity-ui/icons';
import { Icon } from '@gravity-ui/uikit';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { VList } from 'virtua';
import { WorkspaceIcon } from '@/app/components/chat-sidebar/workspace/workspace-icon';
import { SubagentStatusItem } from '@/app/components/status-panel/subagent-status-item';
import { useChatStore } from '@/app/features/chat-page/chat-feed/chat-store';
import { useSessions } from '@/app/hooks/api/sessions';
import { useWorkspaces } from '@/app/hooks/api/workspaces';
import { useI18n } from '@/app/hooks/i18n';
import { useInfiniteScroll } from '@/app/hooks/useInfiniteScroll';
import { groupSessionsByWorkspace } from '@/app/lib/session-groups';
import {
  AeroSessionStatus,
  AeroSessionSummary,
  AeroWorkspaceSummary,
} from '@/server/services/harness/types';

/** Poll cadence while the list is open but nothing is running. */
const IDLE_POLL_INTERVAL = 4000;

/** Faster poll cadence so a finishing child clears its indicator promptly. */
const BUSY_POLL_INTERVAL = 1500;

/** Running section shows at most this many, mirroring the pinned/day lists. */
const RUNNING_INITIAL_LIMIT = 5;

/** Sessions revealed per workspace group, mirroring the workspaces sidebar. */
const WORKSPACE_INITIAL_LIMIT = 3;

/** How many more to reveal per "show more sessions" click. */
const LIMIT_INCREMENT = 5;

type ListEntry =
  | { type: 'section'; key: string; label: string }
  | {
      type: 'workspace';
      key: string;
      label: string;
      workspace?: AeroWorkspaceSummary;
    }
  | { type: 'session'; key: string; session: AeroSessionSummary }
  | { type: 'more'; key: string; label: string; onClick: () => void };

function getBaseName(directory: string) {
  const parts = directory.split(/[\\/]/).filter(Boolean);
  return parts[parts.length - 1] ?? directory;
}

function EntryHeader({
  entry,
}: {
  entry: Extract<ListEntry, { type: 'section' | 'workspace' }>;
}) {
  if (entry.type === 'section') {
    return (
      <div className='text-muted px-2 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wide'>
        {entry.label}
      </div>
    );
  }

  return (
    <div className='flex items-center gap-1.5 px-2 pt-5 pb-1.5'>
      {entry.workspace ? (
        <WorkspaceIcon workspace={entry.workspace} />
      ) : (
        <Icon data={Folder} size={14} className='text-muted' />
      )}
      <span className='text-muted truncate text-xs font-medium'>
        {entry.label}
      </span>
    </div>
  );
}

export function SubagentsList() {
  const { t } = useI18n();

  const runningSessions = useChatStore((state) => state.runningSessions);
  const runningSet = useMemo(() => new Set(runningSessions), [runningSessions]);

  const [refetchInterval, setRefetchInterval] = useState<number | false>(
    IDLE_POLL_INTERVAL,
  );
  const [runningLimit, setRunningLimit] = useState(RUNNING_INITIAL_LIMIT);
  const [workspaceLimits, setWorkspaceLimits] = useState<
    Record<string, number>
  >({});

  const sessionsQuery = useSessions({
    childSessionsOnly: true,
    refetchInterval,
  });

  const {
    items: sessions,
    loadMoreRef,
    hasNextPage,
    isFetchingNextPage,
  } = useInfiniteScroll<AeroSessionSummary>(sessionsQuery);

  const workspacesQuery = useWorkspaces();
  const workspaces = useMemo(
    () => workspacesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [workspacesQuery.data],
  );

  const getStatus = useCallback(
    (session: AeroSessionSummary): AeroSessionStatus['type'] | undefined => {
      if (runningSet.has(session.id)) return 'busy';

      const type = session.status?.type;
      return type === 'idle' ? undefined : type;
    },
    [runningSet],
  );

  // Poll to keep status fresh. Child status events are delivered per-session and
  // never reach the parent's stream, so polling is the only live source for the
  // global subagents list. A baseline cadence catches idle -> busy; while
  // something is running we poll faster so busy -> idle clears promptly.
  useEffect(() => {
    const hasBusy = sessions.some(
      (session) => getStatus(session) !== undefined,
    );
    setRefetchInterval(hasBusy ? BUSY_POLL_INTERVAL : IDLE_POLL_INTERVAL);
  }, [sessions, getStatus]);

  const { running, workspaceGroups } = useMemo(() => {
    const running = sessions.filter(
      (session) => getStatus(session) !== undefined,
    );

    // Running subagents are shown in their own section, so exclude them from the
    // workspace history to avoid duplicate rows (same as pinned/day grouping).
    const runningIds = new Set(running.map((session) => session.id));
    const history = sessions.filter((session) => !runningIds.has(session.id));

    return {
      running,
      workspaceGroups: groupSessionsByWorkspace(history, workspaces),
    };
  }, [sessions, workspaces, getStatus]);

  const revealMore = useCallback(
    (setLimit: () => void) => {
      setLimit();
      if (hasNextPage) void sessionsQuery.fetchNextPage();
    },
    [hasNextPage, sessionsQuery],
  );

  const entries = useMemo<ListEntry[]>(() => {
    const entries: ListEntry[] = [];

    if (running.length > 0) {
      entries.push({
        type: 'section',
        key: 'section-running',
        label: t.sideChat.running,
      });

      for (const session of running.slice(0, runningLimit)) {
        entries.push({
          type: 'session',
          key: `running-${session.id}`,
          session,
        });
      }

      if (running.length > runningLimit) {
        entries.push({
          type: 'more',
          key: 'more-running',
          label: t.workspace.showMoreSessions,
          onClick: () =>
            revealMore(() =>
              setRunningLimit((limit) => limit + LIMIT_INCREMENT),
            ),
        });
      }
    }

    if (workspaceGroups.length > 0) {
      entries.push({
        type: 'section',
        key: 'section-workspaces',
        label: t.sidebar.workspaces,
      });

      for (const group of workspaceGroups) {
        entries.push({
          type: 'workspace',
          key: `workspace-${group.key}`,
          label: group.workspace?.name ?? getBaseName(group.directory),
          workspace: group.workspace,
        });

        const limit = workspaceLimits[group.key] ?? WORKSPACE_INITIAL_LIMIT;

        for (const session of group.sessions.slice(0, limit)) {
          entries.push({
            type: 'session',
            key: `workspace-${group.key}-${session.id}`,
            session,
          });
        }

        if (group.sessions.length > limit) {
          entries.push({
            type: 'more',
            key: `more-${group.key}`,
            label: t.workspace.showMoreSessions,
            onClick: () =>
              revealMore(() =>
                setWorkspaceLimits((limits) => ({
                  ...limits,
                  [group.key]:
                    (limits[group.key] ?? WORKSPACE_INITIAL_LIMIT) +
                    LIMIT_INCREMENT,
                })),
              ),
          });
        }
      }
    }

    return entries;
  }, [running, runningLimit, workspaceGroups, workspaceLimits, revealMore, t]);

  if (sessionsQuery.isLoading && sessions.length === 0) {
    return (
      <div className='overflow-hidden relative h-[calc(100svh-56px-48px)]'>
        <div className='p-2 space-y-2'>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className='h-14 w-full rounded-md' />
          ))}
        </div>
      </div>
    );
  }

  if (sessions.length === 0) {
    return (
      <div className='overflow-hidden relative h-[calc(100svh-56px-48px)]'>
        <div className='flex h-full flex-col items-center justify-center gap-1 px-4 text-center'>
          <p className='text-sm font-medium text-foreground'>
            {t.sideChat.noSubagents}
          </p>
          <p className='text-xs text-muted'>{t.sideChat.spawnedSubagents}</p>
        </div>
      </div>
    );
  }

  return (
    <div className='overflow-hidden relative h-[calc(100svh-56px-48px)]'>
      <VList className='p-2 scrollbar-thin overflow-x-hidden'>
        {entries.map((entry) => {
          if (entry.type === 'session') {
            return (
              <SubagentStatusItem
                key={entry.key}
                session={entry.session}
                status={getStatus(entry.session)}
              />
            );
          }

          if (entry.type === 'more') {
            return (
              <div key={entry.key} className='px-2 py-1'>
                <button
                  type='button'
                  disabled={isFetchingNextPage}
                  onClick={entry.onClick}
                  className='text-muted hover:text-foreground text-xs disabled:opacity-50'
                >
                  {isFetchingNextPage ? t.common.loading : entry.label}
                </button>
              </div>
            );
          }

          return <EntryHeader key={entry.key} entry={entry} />;
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
